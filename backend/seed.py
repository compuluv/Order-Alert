"""Idempotent seed of the Central Bar & Grill menu. Run: cd /app/backend && python seed.py"""
import asyncio

from lib.db import db
from models.dining import MenuItem

JERK = "https://images.unsplash.com/photo-1610057098265-05f2bcbedd55?crop=entropy&cs=srgb&fm=jpg&w=800&q=80"
HERO = "https://images.unsplash.com/photo-1632852576480-c10a8e19496a?crop=entropy&cs=srgb&fm=jpg&w=800&q=80"
RUM = "https://images.unsplash.com/photo-1625321643320-5321f48312b2?crop=entropy&cs=srgb&fm=jpg&w=800&q=80"
COCKTAIL = "https://images.unsplash.com/photo-1598994392980-53a7fb033bcc?crop=entropy&cs=srgb&fm=jpg&w=800&q=80"
PLANTAIN = "https://images.unsplash.com/photo-1762884601729-0eeeafbdfb8a?crop=entropy&cs=srgb&fm=jpg&w=800&q=80"

RICE = ["Rice & Peas", "White Rice"]
WINGS = ["BBQ", "Medium", "Sweet Chilli", "Honey Garlic", "Hot Sauce"]

MENU = [
    # Appetizers
    ("Soup Of The Day", "Ask your server for today's pot. Make it large for +$2.", 8.00, "Appetizers", PLANTAIN, [], False),
    ("Fried Saltfish", "Crispy golden-fried salt fish topped with spicy pickled vegetables.", 9.50, "Appetizers", PLANTAIN, [], False),
    ("Fried Calamari", "Battered and fried to golden perfection with a sweet & tangy sauce.", 14.50, "Appetizers", PLANTAIN, [], False),
    ("Bang Bang Shrimp", "Crispy hand-breaded shrimp (8) with our house-made spicy aioli.", 23.75, "Appetizers", HERO, [], True),
    ("Island Shrimp", "Jumbo shrimp (8) tossed in your choice of sauce.", 23.50, "Appetizers", HERO, ["Jerk", "Garlic", "Sweet Chilli"], False),
    # Entrees
    ("Jerk Chicken", "Smoky, spice-infused jerk chicken grilled over pimento wood.", 15.25, "Entrees", JERK, RICE, True),
    ("Curry Goat", "Tender slow-cooked goat in rich aromatic curry and island spices.", 16.50, "Entrees", HERO, RICE, True),
    ("Fried Chicken", "Crispy golden-fried chicken seasoned with bold Caribbean spices.", 14.75, "Entrees", JERK, RICE, False),
    ("Jerk Pork", "Tender, smoky spice-rubbed pork grilled to perfection.", 15.75, "Entrees", JERK, RICE, False),
    ("Chicken Wings", "1lb crispy wings, plain or sauced your way.", 16.75, "Entrees", JERK, WINGS, False),
    ("Vegetable Stir Fry", "A colourful medley of fresh sauteed vegetables, boldly seasoned.", 16.25, "Entrees", PLANTAIN, RICE, False),
    ("Mix 'n Match", "Choose any two: Curry Goat, Fried Chicken or Jerk Chicken.", 22.50, "Entrees", HERO, RICE, False),
    # Seafood
    ("Rasta Pasta", "Creamy pasta infused with bold jerk seasoning.", 19.50, "Seafood", HERO, ["Plain", "Add Chicken +$6.25", "Add Shrimp +$8.25"], True),
    ("King Fish Dinner", "Tender king fish cooked with fresh vegetables.", 19.75, "Seafood", HERO, ["Fried", "Brownstew"], False),
    ("Shrimp Stir Fry", "Juicy shrimp (5) sauteed with fresh vegetables, seasoned your way.", 24.50, "Seafood", HERO, ["Curry", "Garlic", "Pepper"], False),
    ("Snapper Fish Dinner", "Fresh whole snapper with vegetables, brownstew or steamed with okra.", 28.50, "Seafood", HERO, RICE, False),
    ("Garlic Butter Seafood", "Thursday feast: crab, lobster, shrimp, mussels & corn in garlic butter.", 40.00, "Seafood", HERO, ["Creamy Mash", "White Rice", "Rice & Peas"], True),
    # Sides
    ("Fried Plantains", "Five sweet golden slices of ripe plantain, perfectly caramelized.", 4.00, "Sides", PLANTAIN, [], False),
    ("Green Pressed Plantains", "Crispy slices of green plantain, lightly salted and pressed.", 7.00, "Sides", PLANTAIN, [], False),
    ("Festivals", "Sweet golden-fried dumplings, soft centre and crispy outside.", 1.50, "Sides", PLANTAIN, [], False),
    ("Bammy", "Traditional cassava flatbread fried until golden.", 2.00, "Sides", PLANTAIN, [], False),
    ("Fries", "Crispy golden fries — a classic that never disappoints.", 5.75, "Sides", PLANTAIN, [], False),
    ("Rice & Peas", "Coconut-infused rice slow-cooked with kidney beans and island herbs.", 5.50, "Sides", PLANTAIN, [], False),
    # Drinks (all cocktails, punches & blends)
    ("Rum Punch", "Wray & Nephew rum, tropical juices and a splash of citrus.", 16.50, "Drinks", RUM, [], True),
    ("Margarita", "Espolon Tequila, fresh lime and citrus. Shaken, never blended.", 17.00, "Drinks", COCKTAIL, [], False),
    ("Finding Nemo", "Hypnotiq, Malibu Rum and Blue Curacao. Sweet and tropical.", 15.75, "Drinks", COCKTAIL, [], False),
    ("Lychee Martini", "Absolut Vodka and Soho Lychee with a fresh lychee garnish.", 17.00, "Drinks", COCKTAIL, [], False),
    ("Amaretto Sour", "Amaretto, fresh citrus and a bold nutty twist.", 15.75, "Drinks", COCKTAIL, [], False),
    
    ("Mango Daiquiri", "Frozen Wray & Nephew rum blended with juicy mango.", 15.75, "Drinks", COCKTAIL, [], False),
    ("Strawberry Daiquiri", "Frozen rum and fresh strawberry — full of island vibes.", 15.75, "Drinks", COCKTAIL, [], False),
    ("Pina Colada", "Creamy coconut, pineapple and Malibu Rum over ice.", 15.75, "Drinks", RUM, [], False),
    ("Peach Bellini", "Appleton Signature Rum blended with juicy peach.", 17.00, "Drinks", RUM, [], False),
]


async def main() -> None:
    for name, desc, price, cat, img, opts, sig in MENU:
        item = MenuItem(
            name=name, description=desc, price=price, category=cat,
            image_url=img, options=list(opts), signature=sig,
        )
        await db.menu_items.update_one(
            {"name": name},
            {"$set": item.model_dump(exclude={"id"}), "$setOnInsert": {"id": item.id}},
            upsert=True,
        )
    print(f"seeded {len(MENU)} menu items")


if __name__ == "__main__":
    asyncio.run(main())
