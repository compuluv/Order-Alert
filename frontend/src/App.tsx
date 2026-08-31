import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import StaffGate from "@/components/StaffGate";
import Home from "@/pages/Home";
import OrderMenu from "@/pages/OrderMenu";
import OrderStatus from "@/pages/OrderStatus";
import StaffBoard from "@/pages/StaffBoard";
import StaffQr from "@/pages/StaffQr";
import CounterDisplay from "@/pages/CounterDisplay";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/order" element={<OrderMenu />} />
        {/* Legacy table/takeout links (already-printed QRs) now land on the single menu. */}
        <Route path="/table/:tableId" element={<Navigate to="/order" replace />} />
        <Route path="/takeout" element={<Navigate to="/order" replace />} />
        <Route path="/status/:orderId" element={<OrderStatus />} />
        {/* Counter TV screen — deliberately ungated so it can be left running. */}
        <Route path="/counter" element={<CounterDisplay />} />
        <Route
          path="/staff"
          element={
            <StaffGate>
              <StaffBoard />
            </StaffGate>
          }
        />
        <Route
          path="/staff/qr"
          element={
            <StaffGate>
              <StaffQr />
            </StaffGate>
          }
        />
        <Route path="/staff/tables" element={<Navigate to="/staff/qr" replace />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}
