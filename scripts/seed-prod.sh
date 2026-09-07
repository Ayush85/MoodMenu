#!/bin/sh
set -e

echo "Checking if database needs seeding..."

# Run count query using DATABASE_URL directly, so this works regardless of DB host
COUNT=$(psql "$DATABASE_URL" -tAc "SELECT count(*) FROM \"User\";" 2>/dev/null || echo "0")

if [ "$COUNT" != "0" ] && [ "$COUNT" != "" ]; then
  echo "Database has $COUNT users. Skipping seed."
  exit 0
fi

echo "Generating password hashes..."
HASH1=$(node -e "require('bcryptjs').hash('Admin@123',12).then(h=>process.stdout.write(h))")
HASH2=$(node -e "require('bcryptjs').hash('admin@123',12).then(h=>process.stdout.write(h))")

echo "Inserting seed data..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL

-- Users
INSERT INTO "User" (id, email, name, password, role, "isActive", "createdAt")
VALUES
  ('sa1', 'ayush85.dev@gmail.com', 'Ayush Super Admin', '$HASH1', 'SUPER_ADMIN', true, NOW()),
  ('ad1', 'ayushrestha8585@gmail.com', 'Ayush Admin', '$HASH2', 'ADMIN', true, NOW());

-- Restaurant
INSERT INTO "Restaurant" (id, slug, name, city, "wifiSsid", "wifiPassword", "ownerId", "createdAt", "updatedAt")
VALUES ('r1', 'ayush-test-kitchen', 'Ayush Test Kitchen', 'Kathmandu', 'Menuor-WiFi', 'moodmenu123', 'ad1', NOW(), NOW());

-- Categories
INSERT INTO "Category" (id, name, "order", "restaurantId")
VALUES ('c1', 'Momos', 0, 'r1'), ('c2', 'Drinks', 1, 'r1'), ('c3', 'Main Course', 2, 'r1');

-- Menu Items
INSERT INTO "MenuItem" (id, name, description, price, image, tags, "isAvailable", "isSpecial", "categoryId", "createdAt", "updatedAt")
VALUES
  ('i1',  'Jhol Momo',      'Steamed momos in spicy jhol soup — perfect for rainy days',       200, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/jhol-momo.jpg',      '{hot,comfort,spicy,popular}', true, false, 'c1', NOW(), NOW()),
  ('i2',  'Steam Momo',     'Classic steamed chicken momos with homemade achar',                180, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/steam-momo.jpg',     '{hot,comfort}',               true, false, 'c1', NOW(), NOW()),
  ('i3',  'Fried Momo',     'Crispy golden fried momos with spicy tomato chutney',              220, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/fried-momo.jpg',     '{hot,crispy,snack}',          true, false, 'c1', NOW(), NOW()),
  ('i4',  'C Momo',         'Chili momos tossed in fiery Szechuan sauce',                       250, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/c-momo.jpg',         '{hot,spicy,popular}',         true, true,  'c1', NOW(), NOW()),
  ('i5',  'Iced Americano', 'Double-shot cold-brewed espresso over ice',                        180, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/iced-americano.jpg', '{cold,refreshing,iced,coffee}', true, false, 'c2', NOW(), NOW()),
  ('i6',  'Masala Chiya',   'Traditional Nepali spiced milk tea with cardamom & ginger',         60, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/masala-chiya.jpg',   '{hot,tea,comfort,warm}',      true, true,  'c2', NOW(), NOW()),
  ('i7',  'Lemon Soda',     'Fresh lemon soda — choose sweet or salty',                          80, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/lemon-soda.jpg',    '{cold,refreshing}',           true, false, 'c2', NOW(), NOW()),
  ('i8',  'Thukpa',         'Hearty Tibetan noodle soup with seasonal vegetables',              220, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/thukpa.jpg',         '{hot,comfort,soup,warm}',     true, false, 'c3', NOW(), NOW()),
  ('i9',  'Chowmein',       'Wok-tossed noodles with mixed vegetables & soy glaze',            180, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/chowmein.jpg',       '{hot,popular}',               true, false, 'c3', NOW(), NOW()),
  ('i10', 'Sekuwa',         'Charcoal-grilled marinated meat skewers with chimichurri',         350, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/sekuwa.jpg',         '{hot,popular,special}',       true, true,  'c3', NOW(), NOW());

-- Mood Rules
INSERT INTO "MoodRule" (id, name, condition, theme, "featuredTags", priority, "restaurantId")
VALUES
  ('mr1', 'Rainy Day Comfort', '{"weather":["Rain","Drizzle","Thunderstorm"]}',  '{"mode":"dark","primary":"#F97316","accent":"#FDE68A","bg":"#1C1917","text":"#FAFAF9"}',  '{hot,comfort,soup}',     3, 'r1'),
  ('mr2', 'Sunny Energy',      '{"weather":["Clear"]}',                           '{"mode":"light","primary":"#06B6D4","accent":"#A5F3FC","bg":"#ECFEFF","text":"#164E63"}',  '{cold,refreshing,iced}', 2, 'r1'),
  ('mr3', 'Cloudy Chill',      '{"weather":["Clouds","Mist","Fog","Haze"]}',      '{"mode":"light","primary":"#8B5CF6","accent":"#DDD6FE","bg":"#FAF5FF","text":"#4C1D95"}',  '{warm,tea,snack}',       1, 'r1'),
  ('mr4', 'Late Night Vibes',  '{"weather":[],"timeRange":["21:00","05:00"]}',     '{"mode":"dark","primary":"#EC4899","accent":"#FBCFE8","bg":"#0F172A","text":"#F8FAFC"}',   '{special,popular}',      0, 'r1');

-- Tables
INSERT INTO "RestaurantTable" (id, number, label, "restaurantId")
VALUES ('t1',1,'Window','r1'), ('t2',2,'Family','r1'), ('t3',3,'Patio','r1'), ('t4',4,'Counter','r1'), ('t5',5,'Garden','r1');

SQL

echo ""
echo "============================="
echo "  Seed complete!"
echo "  Super Admin: ayush85.dev@gmail.com / Admin@123"
echo "  Admin: ayushrestha8585@gmail.com / admin@123"
echo "  Menu: /menu/ayush-test-kitchen"
echo "============================="
