"""Product/category definitions for the Copperfield Kitchen Co. BigCommerce demo store.

This is a RECORD of what was seeded live into the trial store (hash wflwr11fds) via the
Admin API on 2026-09-15, not a from-scratch idempotent seeder yet — re-running it will
create duplicate products (no upsert-by-SKU check). Treat as the source of truth for
what SHOULD exist; wire real create-or-update semantics before using it against a second
store. Category ids below are THIS store's ids (categories were renamed from BigCommerce's
default sample catalog: Bath->Cookware, Garden->Bakeware, Publications->Tabletop & Dining,
Kitchen->Kitchen Tools, Utility->Storage & Organization, Shop All unchanged).

Credentials: BIGCOMMERCE_DEMO_CLIENT_ID / BIGCOMMERCE_DEMO_CLIENT_SECRET /
BIGCOMMERCE_DEMO_ACCESS_TOKEN in the devtools Vault (store-level API account
"copperfield-demo-connector", scopes: Content=modify, Customers=modify+login,
Information & settings=modify, Orders=modify, Products=modify, Themes=modify,
Storefront API tokens=manage). API base: https://api.bigcommerce.com/stores/wflwr11fds/v3/
"""
import json
import os

OUT = os.path.join(os.path.dirname(__file__), "_generated-product-bodies")
os.makedirs(OUT, exist_ok=True)

CAT = {"cookware": 18, "bakeware": 19, "dining": 20, "tools": 21, "storage": 22, "all": 23}

products = [
  dict(slug="frying-pan-29", name="Copperfield 29cm Frying Pan", price=54.00, weight=1.2, sku="CKC-FP-29",
       cat=[CAT["cookware"], CAT["all"]], bc_id=118,
       desc="A heavy-gauge 29cm frying pan built for even heat across the whole cooking surface. The riveted stainless handle stays cool on the stovetop and the flared rim makes for clean, no-drip pouring.",
       image="https://upload.wikimedia.org/wikipedia/commons/e/ec/Hahn_29cm_Frying_Pan.jpg"),
  dict(slug="cast-iron-skillet-12", name="Cast Iron Skillet 12-Inch", price=68.00, weight=2.5, sku="CKC-CIS-12",
       cat=[CAT["cookware"], CAT["all"]], bc_id=113,
       desc="Pre-seasoned cast iron that goes from stovetop to oven to table. The 12-inch cooking surface holds heat for a deep, even sear and only gets better with age.",
       image="https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/Seared_and_roasted_Pork_Tenderloin_in_Cast_Iron_Skillet.jpg/1280px-Seared_and_roasted_Pork_Tenderloin_in_Cast_Iron_Skillet.jpg"),
  dict(slug="copper-stockpot-8q", name="Hammered Copper Stockpot 8-Qt", price=129.00, weight=2.1, sku="CKC-CSP-8Q",
       cat=[CAT["cookware"], CAT["all"]], bc_id=116,
       desc="An 8-quart hammered-copper stockpot for stocks, soups and big family batches. Copper's fast, even heat response means fewer scorched spots and easier cleanup.",
       image="https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Vintage_brass_cooking_pot%2C_4.jpg/1280px-Vintage_brass_cooking_pot%2C_4.jpg"),
  dict(slug="ceramic-baking-dish", name="Ceramic Baking Dish 9x13", price=38.00, weight=1.4, sku="CKC-CBD-9X13",
       cat=[CAT["bakeware"], CAT["all"]], bc_id=125,
       desc="A glazed stoneware baking dish that moves from oven to table without missing a beat. The 9x13 size is the everyday workhorse for casseroles, gratins and sheet desserts.",
       image="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/2021_Zapiekanka_ziemniaczana_z_beszamelem.jpg/1280px-2021_Zapiekanka_ziemniaczana_z_beszamelem.jpg"),
  dict(slug="muffin-tin-12", name="Non-Stick Muffin Tin 12-Cup", price=24.00, weight=0.6, sku="CKC-MT-12",
       cat=[CAT["bakeware"], CAT["all"]], bc_id=120,
       desc="A 12-cup non-stick muffin tin with reinforced edges that resist warping at high heat. Muffins and cupcakes release clean, every time.",
       image="https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/Cupcake-tin.jpg/1280px-Cupcake-tin.jpg"),
  dict(slug="chefs-knife-8", name="Professional Chef's Knife 8-Inch", price=79.00, weight=0.3, sku="CKC-CK-8",
       cat=[CAT["tools"], CAT["all"]], bc_id=115,
       desc="A full-tang, forged 8-inch chef's knife balanced for hours of prep work. The high-carbon stainless blade takes and holds a fine edge.",
       image="https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Chef%27s_Knife.jpg/1280px-Chef%27s_Knife.jpg"),
  dict(slug="bamboo-cutting-board", name="Bamboo Cutting Board", price=32.00, weight=0.9, sku="CKC-CB-BAM",
       cat=[CAT["tools"], CAT["all"]], bc_id=112,
       desc="A dense end-grain bamboo cutting board that's gentle on knife edges and naturally resistant to moisture and odor. A juice groove keeps countertops clean.",
       image="https://upload.wikimedia.org/wikipedia/commons/9/9e/Wooden_cutting_board_2017.jpg"),
  dict(slug="whisk-set-3", name="Stainless Steel Whisk Set", price=22.00, weight=0.3, sku="CKC-WSK-3",
       cat=[CAT["tools"], CAT["all"]], bc_id=122,
       desc="Three balloon whisks in graduated sizes, from delicate vinaigrettes to heavy batter. Wire loops are welded, not crimped, so they hold up to daily use.",
       image="https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/Schneebesen_--_2022_--_9748.jpg/1280px-Schneebesen_--_2022_--_9748.jpg"),
  dict(slug="stoneware-serving-bowl", name="Stoneware Serving Bowl", price=34.00, weight=1.1, sku="CKC-SSB-1",
       cat=[CAT["dining"], CAT["all"]], bc_id=126,
       desc="A wide stoneware serving bowl with a soft matte glaze, sized for salads, sides or a big batch of pasta at the table.",
       image="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Bowl_Emulating_Chinese_Stoneware_MET_178338.jpg/1280px-Bowl_Emulating_Chinese_Stoneware_MET_178338.jpg"),
  dict(slug="linen-napkin-set-6", name="Linen Table Napkin Set (Set of 6)", price=42.00, weight=0.5, sku="CKC-LNS-6",
       cat=[CAT["dining"], CAT["all"]], bc_id=119,
       desc="Six stonewashed linen napkins that soften with every wash. A relaxed, textured everyday-to-dinner-party napkin.",
       image="https://upload.wikimedia.org/wikipedia/commons/6/6a/12_Course_Table_Setting.jpg"),
  dict(slug="pantry-jar-set-4", name="Pantry Storage Jar Set (Set of 4)", price=36.00, weight=1.8, sku="CKC-PSJ-4",
       cat=[CAT["storage"], CAT["all"]], bc_id=121,
       desc="Four airtight glass storage jars with beechwood lids for flour, sugar, grains and coffee. Clear glass keeps pantry staples visible and fresh.",
       image="https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Pantry_shelf_%28Unsplash%29.jpg/1280px-Pantry_shelf_%28Unsplash%29.jpg"),
  dict(slug="woven-storage-basket", name="Woven Storage Basket", price=28.00, weight=0.5, sku="CKC-WSB-1",
       cat=[CAT["storage"], CAT["all"]], bc_id=127,
       desc="A hand-woven storage basket for bread, produce or countertop odds and ends. Sturdy enough for daily use, light enough to move around the kitchen.",
       image="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Wicker_bread_basket.jpg/1280px-Wicker_bread_basket.jpg"),
]

if __name__ == "__main__":
    for p in products:
        body = {
            "name": p["name"], "type": "physical", "sku": p["sku"], "weight": p["weight"],
            "price": p["price"], "categories": p["cat"], "availability": "available",
            "inventory_level": 40, "inventory_tracking": "product",
            "description": f"<p>{p['desc']}</p>",
            "images": [{"image_url": p["image"], "is_thumbnail": True}],
        }
        with open(os.path.join(OUT, p["slug"] + ".json"), "w") as f:
            json.dump(body, f)
    print("wrote", len(products), "product bodies to", OUT)
