const { PrismaClient } = require("../src/generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const IMG = (name) => `https://aydexis.sgp1.digitaloceanspaces.com/menuor/demo/${name}.jpg`;

async function main() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log("Database already has users, skipping seed.");
    return;
  }

  console.log("Seeding production database...");

  // Super Admin
  const adminPw = await bcrypt.hash("Admin@123", 12);
  await prisma.user.create({
    data: {
      email: "ayush85.dev@gmail.com",
      name: "Ayush Super Admin",
      password: adminPw,
      role: "SUPER_ADMIN",
    },
  });

  // Admin user
  const userPw = await bcrypt.hash("admin@123", 12);
  const admin = await prisma.user.create({
    data: {
      email: "ayushrestha8585@gmail.com",
      name: "Ayush Admin",
      password: userPw,
      role: "ADMIN",
    },
  });

  // Restaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "Ayush Test Kitchen",
      slug: "ayush-test-kitchen",
      city: "Kathmandu",
      ownerId: admin.id,
      wifiSsid: "MoodMenu-Test-WiFi",
      wifiPassword: "moodmenu-test-123",
    },
  });

  // Categories
  const momos = await prisma.category.create({ data: { name: "Momos", order: 0, restaurantId: restaurant.id } });
  const drinks = await prisma.category.create({ data: { name: "Drinks", order: 1, restaurantId: restaurant.id } });
  const mains = await prisma.category.create({ data: { name: "Main Course", order: 2, restaurantId: restaurant.id } });

  // Menu items with images
  await prisma.menuItem.createMany({
    data: [
      { name: "Jhol Momo", description: "Steamed momos in spicy jhol soup — perfect for rainy days", price: 200, image: IMG("jhol-momo"), tags: ["hot", "comfort", "spicy", "popular"], categoryId: momos.id },
      { name: "Steam Momo", description: "Classic steamed chicken momos with homemade achar", price: 180, image: IMG("steam-momo"), tags: ["hot", "comfort"], categoryId: momos.id },
      { name: "Fried Momo", description: "Crispy golden fried momos with spicy tomato chutney", price: 220, image: IMG("fried-momo"), tags: ["hot", "crispy", "snack"], categoryId: momos.id },
      { name: "C Momo", description: "Chili momos tossed in fiery Szechuan sauce", price: 250, image: IMG("c-momo"), tags: ["hot", "spicy", "popular"], categoryId: momos.id },
      { name: "Iced Americano", description: "Double-shot cold-brewed espresso over ice", price: 180, image: IMG("iced-americano"), tags: ["cold", "refreshing", "iced", "coffee"], categoryId: drinks.id },
      { name: "Masala Chiya", description: "Traditional Nepali spiced milk tea with cardamom & ginger", price: 60, image: IMG("masala-chiya"), tags: ["hot", "tea", "comfort", "warm"], categoryId: drinks.id },
      { name: "Lemon Soda", description: "Fresh lemon soda — choose sweet or salty", price: 80, image: IMG("lemon-soda"), tags: ["cold", "refreshing"], categoryId: drinks.id },
      { name: "Thukpa", description: "Hearty Tibetan noodle soup with seasonal vegetables", price: 220, image: IMG("thukpa"), tags: ["hot", "comfort", "soup", "warm"], categoryId: mains.id },
      { name: "Chowmein", description: "Wok-tossed noodles with mixed vegetables & soy glaze", price: 180, image: IMG("chowmein"), tags: ["hot", "popular"], categoryId: mains.id },
      { name: "Sekuwa", description: "Charcoal-grilled marinated meat skewers with chimichurri", price: 350, image: IMG("sekuwa"), tags: ["hot", "popular", "special"], categoryId: mains.id },
    ],
  });

  // Mood rules
  await prisma.moodRule.createMany({
    data: [
      { name: "Rainy Day Comfort", condition: { weather: ["Rain", "Drizzle", "Thunderstorm"] }, theme: { mode: "dark", primary: "#F97316", accent: "#FDE68A", bg: "#1C1917", text: "#FAFAF9" }, featuredTags: ["hot", "comfort", "soup"], priority: 3, restaurantId: restaurant.id },
      { name: "Sunny Energy", condition: { weather: ["Clear"] }, theme: { mode: "light", primary: "#06B6D4", accent: "#A5F3FC", bg: "#ECFEFF", text: "#164E63" }, featuredTags: ["cold", "refreshing", "iced"], priority: 2, restaurantId: restaurant.id },
      { name: "Cloudy Chill", condition: { weather: ["Clouds", "Mist", "Fog", "Haze"] }, theme: { mode: "light", primary: "#8B5CF6", accent: "#DDD6FE", bg: "#FAF5FF", text: "#4C1D95" }, featuredTags: ["warm", "tea", "snack"], priority: 1, restaurantId: restaurant.id },
      { name: "Late Night Vibes", condition: { weather: [], timeRange: ["21:00", "05:00"] }, theme: { mode: "dark", primary: "#EC4899", accent: "#FBCFE8", bg: "#0F172A", text: "#F8FAFC" }, featuredTags: ["special", "dessert", "popular"], priority: 0, restaurantId: restaurant.id },
    ],
  });

  // Tables
  await prisma.restaurantTable.createMany({
    data: [
      { number: 1, label: "Window", restaurantId: restaurant.id },
      { number: 2, label: "Family", restaurantId: restaurant.id },
      { number: 3, label: "Patio", restaurantId: restaurant.id },
      { number: 4, label: "Counter", restaurantId: restaurant.id },
      { number: 5, label: "Garden", restaurantId: restaurant.id },
    ],
  });

  console.log("Seed complete!");
  console.log("Super Admin: ayush85.dev@gmail.com / Admin@123");
  console.log("Admin: ayushrestha8585@gmail.com / admin@123");
}

main()
  .catch((e) => { console.error("Seed error:", e.message); process.exit(0); })
  .finally(() => prisma.$disconnect());
