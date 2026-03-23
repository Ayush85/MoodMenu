#!/bin/sh
set -e

echo "Checking if database needs seeding..."

COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -U moodmenu -d moodmenu -h db -t -c "SELECT count(*) FROM \"User\";" 2>/dev/null | tr -d ' ')

if [ "$COUNT" != "0" ]; then
  echo "Database already has $COUNT users. Skipping seed."
  exit 0
fi

echo "Seeding database..."

# Generate bcrypt hashes
HASH_SUPER=$(node -e "require('bcryptjs').hash('Admin@123',12).then(h=>console.log(h))")
HASH_ADMIN=$(node -e "require('bcryptjs').hash('admin@123',12).then(h=>console.log(h))")

PGPASSWORD=$POSTGRES_PASSWORD psql -U moodmenu -d moodmenu -h db << SEED

-- Users
INSERT INTO "User" (id, email, name, password, role, "isActive", "createdAt") VALUES
('sa1', 'ayush85.dev@gmail.com', 'Ayush Super Admin', '${HASH_SUPER}', 'SUPER_ADMIN', true, NOW()),
('ad1', 'ayushrestha8585@gmail.com', 'Ayush Admin', '${HASH_ADMIN}', 'ADMIN', true, NOW());

-- Restaurant
INSERT INTO "Restaurant" (id, slug, name, city, "wifiSsid", "wifiPassword", "ownerId", "createdAt", "updatedAt") VALUES
('r1', 'ayush-test-kitchen', 'Ayush Test Kitchen', 'Kathmandu', 'MoodMenu-WiFi', 'moodmenu123', 'ad1', NOW(), NOW());

-- Categories
INSERT INTO "Category" (id, name, "order", "restaurantId") VALUES
('c1', 'Momos', 0, 'r1'),
('c2', 'Drinks', 1, 'r1'),
('c3', 'Main Course', 2, 'r1');

-- Menu Items
INSERT INTO "MenuItem" (id, name, description, price, image, tags, "isAvailable", "categoryId", "createdAt", "updatedAt") VALUES
('i1',  'Jhol Momo',       'Steamed momos in spicy jhol soup — perfect for rainy days',       200, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/jhol-momo.jpg',       ARRAY['hot','comfort','spicy','popular'], true, 'c1', NOW(), NOW()),
('i2',  'Steam Momo',      'Classic steamed chicken momos with homemade achar',                180, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/steam-momo.jpg',      ARRAY['hot','comfort'],                  true, 'c1', NOW(), NOW()),
('i3',  'Fried Momo',      'Crispy golden fried momos with spicy tomato chutney',              220, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/fried-momo.jpg',      ARRAY['hot','crispy','snack'],            true, 'c1', NOW(), NOW()),
('i4',  'C Momo',          'Chili momos tossed in fiery Szechuan sauce',                       250, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/c-momo.jpg',          ARRAY['hot','spicy','popular'],           true, 'c1', NOW(), NOW()),
('i5',  'Iced Americano',  'Double-shot cold-brewed espresso over ice',                        180, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/iced-americano.jpg',  ARRAY['cold','refreshing','iced','coffee'], true, 'c2', NOW(), NOW()),
('i6',  'Masala Chiya',    'Traditional Nepali spiced milk tea with cardamom & ginger',         60, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/masala-chiya.jpg',    ARRAY['hot','tea','comfort','warm'],      true, 'c2', NOW(), NOW()),
('i7',  'Lemon Soda',      'Fresh lemon soda — choose sweet or salty',                          80, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/lemon-soda.jpg',     ARRAY['cold','refreshing'],              true, 'c2', NOW(), NOW()),
('i8',  'Thukpa',          'Hearty Tibetan noodle soup with seasonal vegetables',              220, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/thukpa.jpg',          ARRAY['hot','comfort','soup','warm'],     true, 'c3', NOW(), NOW()),
('i9',  'Chowmein',        'Wok-tossed noodles with mixed vegetables & soy glaze',            180, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/chowmein.jpg',        ARRAY['hot','popular'],                  true, 'c3', NOW(), NOW()),
('i10', 'Sekuwa',          'Charcoal-grilled marinated meat skewers with chimichurri',         350, 'https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/sekuwa.jpg',          ARRAY['hot','popular','special'],         true, 'c3', NOW(), NOW());

-- Mood Rules
INSERT INTO "MoodRule" (id, name, condition, theme, "featuredTags", priority, "restaurantId") VALUES
('mr1', 'Rainy Day Comfort', '{"weather":["Rain","Drizzle","Thunderstorm"]}',    '{"mode":"dark","primary":"#F97316","accent":"#FDE68A","bg":"#1C1917","text":"#FAFAF9"}',  ARRAY['hot','comfort','soup'],       3, 'r1'),
('mr2', 'Sunny Energy',      '{"weather":["Clear"]}',                             '{"mode":"light","primary":"#06B6D4","accent":"#A5F3FC","bg":"#ECFEFF","text":"#164E63"}',  ARRAY['cold','refreshing','iced'],   2, 'r1'),
('mr3', 'Cloudy Chill',      '{"weather":["Clouds","Mist","Fog","Haze"]}',        '{"mode":"light","primary":"#8B5CF6","accent":"#DDD6FE","bg":"#FAF5FF","text":"#4C1D95"}',  ARRAY['warm','tea','snack'],         1, 'r1'),
('mr4', 'Late Night Vibes',  '{"weather":[],"timeRange":["21:00","05:00"]}',       '{"mode":"dark","primary":"#EC4899","accent":"#FBCFE8","bg":"#0F172A","text":"#F8FAFC"}',   ARRAY['special','popular'],          0, 'r1');

-- Tables
INSERT INTO "RestaurantTable" (id, number, label, "restaurantId") VALUES
('t1', 1, 'Window',  'r1'),
('t2', 2, 'Family',  'r1'),
('t3', 3, 'Patio',   'r1'),
('t4', 4, 'Counter', 'r1'),
('t5', 5, 'Garden',  'r1');

SEED

echo ""
echo "============================="
echo "  Seed complete!"
echo "  Super Admin: ayush85.dev@gmail.com / Admin@123"
echo "  Admin: ayushrestha8585@gmail.com / admin@123"
echo "  Menu: /menu/ayush-test-kitchen"
echo "============================="
