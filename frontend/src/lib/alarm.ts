/**
 * Loud, repeating pickup alarm for a noisy room.
 *
 * Browsers block audio until a user gesture, so `unlockAudio()` must be called
 * from a click handler (placing an order, tapping "enable alert"). The context is
 * module-level, so it survives client-side navigation within the SPA.
 */

let ctx: AudioContext | null = null;
let loop: number | null = null;
let vibeLoop: number | null = null;
let masterGain: GainNode | null = null;

function makeCtx(): AudioContext | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor();
}

/** Call from a user gesture so the alarm is allowed to sound later. */
export function unlockAudio() {
  try {
    ctx ??= makeCtx();
    if (!ctx) return;
    void ctx.resume();
    if (!masterGain) {
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.9;
      masterGain.connect(ctx.destination);
    }
    // A silent blip completes the unlock on iOS Safari.
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  } catch {
    /* audio unavailable */
  }
}

export function audioReady(): boolean {
  return ctx !== null && ctx.state === "running";
}

/** One loud two-tone siren burst — deliberately piercing so it cuts through noise. */
function burst() {
  if (!ctx || !masterGain) return;
  const now = ctx.currentTime;
  const tones = [1046.5, 1568, 1046.5, 1568];
  tones.forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const start = now + i * 0.22;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.5, start + 0.02);
    gain.gain.setValueAtTime(0.5, start + 0.17);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.21);
    osc.connect(gain).connect(masterGain!);
    osc.start(start);
    osc.stop(start + 0.22);
  });
}

function vibrate() {
  try {
    navigator.vibrate?.([500, 200, 500, 200, 900]);
  } catch {
    /* unsupported */
  }
}

/** Starts the alarm and keeps it going until stopAlarm() is called. */
export function startAlarm() {
  unlockAudio();
  if (loop !== null) return;
  burst();
  vibrate();
  loop = window.setInterval(burst, 1400);
  vibeLoop = window.setInterval(vibrate, 2600);
}

export function stopAlarm() {
  if (loop !== null) {
    clearInterval(loop);
    loop = null;
  }
  if (vibeLoop !== null) {
    clearInterval(vibeLoop);
    vibeLoop = null;
  }
  try {
    navigator.vibrate?.(0);
  } catch {
    /* unsupported */
  }
}

export function alarmRunning(): boolean {
  return loop !== null;
}

export function notify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, requireInteraction: true } as NotificationOptions);
    }
  } catch {
    /* unavailable */
  }
}
