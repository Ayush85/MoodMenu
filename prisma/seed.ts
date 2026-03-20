import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create requested super admin
  const superAdminPassword = await bcrypt.hash("Admin@123", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "ayush85.dev@gmail.com" },
    update: {
      name: "Ayush Super Admin",
      password: superAdminPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      email: "ayush85.dev@gmail.com",
      name: "Ayush Super Admin",
      password: superAdminPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log("Super Admin ready:", superAdmin.email);

  // Create requested admin user
  const adminPassword = await bcrypt.hash("admin@123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "ayushrestha8585@gmail.com" },
    update: {
      name: "Ayush Admin",
      password: adminPassword,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      email: "ayushrestha8585@gmail.com",
      name: "Ayush Admin",
      password: adminPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  // Create one test restaurant for the admin user
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "ayush-test-kitchen" },
    update: {
      name: "Ayush Test Kitchen",
      city: "Kathmandu",
      ownerId: adminUser.id,
      wifiSsid: "MoodMenu-Test-WiFi",
      wifiPassword: "moodmenu-test-123",
    },
    create: {
      name: "Ayush Test Kitchen",
      slug: "ayush-test-kitchen",
      city: "Kathmandu",
      ownerId: adminUser.id,
      wifiSsid: "MoodMenu-Test-WiFi",
      wifiPassword: "moodmenu-test-123",
    },
  });

  // Keep seed reruns clean and deterministic for this restaurant.
  await prisma.waiterCall.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.restaurantTable.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.moodRule.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.category.deleteMany({ where: { restaurantId: restaurant.id } });

  // Create categories
  const momos = await prisma.category.create({
    data: { name: "Momos", order: 0, restaurantId: restaurant.id },
  });
  const drinks = await prisma.category.create({
    data: { name: "Drinks", order: 1, restaurantId: restaurant.id },
  });
  const mains = await prisma.category.create({
    data: { name: "Main Course", order: 2, restaurantId: restaurant.id },
  });

  // Create menu items
  await prisma.menuItem.createMany({
    data: [
      { name: "Jhol Momo", description: "Steamed momos in spicy jhol soup", price: 200, tags: ["hot", "comfort", "spicy", "popular"], categoryId: momos.id },
      { name: "Steam Momo", description: "Classic steamed chicken momos with achar", price: 180, tags: ["hot", "comfort"], categoryId: momos.id },
      { name: "Fried Momo", description: "Crispy fried momos with spicy chutney", price: 220, tags: ["hot", "crispy", "snack"], categoryId: momos.id },
      { name: "C Momo", description: "Chili momos tossed in spicy sauce", price: 250, tags: ["hot", "spicy", "popular"], categoryId: momos.id },
      { name: "Iced Americano", description: "Cold-brewed espresso over ice", price: 180, tags: ["cold", "refreshing", "iced", "coffee"], categoryId: drinks.id },
      { name: "Masala Chiya", description: "Traditional Nepali spiced milk tea", price: 60, tags: ["hot", "tea", "comfort", "warm"], categoryId: drinks.id },
      { name: "Lemon Soda", description: "Fresh lemon soda — sweet or salty", price: 80, tags: ["cold", "refreshing"], categoryId: drinks.id },
      { name: "Thukpa", description: "Tibetan noodle soup with vegetables", price: 220, tags: ["hot", "comfort", "soup", "warm"], categoryId: mains.id },
      { name: "Chowmein", description: "Stir-fried noodles with mixed vegetables", price: 180, tags: ["hot", "popular"], categoryId: mains.id },
      { name: "Sekuwa", description: "Grilled marinated meat skewers", price: 350, tags: ["hot", "popular", "special"], categoryId: mains.id },
    ],
  });

  // Create mood rules
  await prisma.moodRule.createMany({
    data: [
      { name: "Rainy Day Comfort", condition: { weather: ["Rain", "Drizzle", "Thunderstorm"] }, theme: { mode: "dark", primary: "#F97316", accent: "#FDE68A", bg: "#1C1917", text: "#FAFAF9" }, featuredTags: ["hot", "comfort", "soup"], priority: 3, restaurantId: restaurant.id },
      { name: "Sunny Energy", condition: { weather: ["Clear"] }, theme: { mode: "light", primary: "#06B6D4", accent: "#A5F3FC", bg: "#ECFEFF", text: "#164E63" }, featuredTags: ["cold", "refreshing", "iced"], priority: 2, restaurantId: restaurant.id },
      { name: "Cloudy Chill", condition: { weather: ["Clouds", "Mist", "Fog", "Haze"] }, theme: { mode: "light", primary: "#8B5CF6", accent: "#DDD6FE", bg: "#FAF5FF", text: "#4C1D95" }, featuredTags: ["warm", "tea", "snack"], priority: 1, restaurantId: restaurant.id },
      { name: "Late Night Vibes", condition: { weather: [], timeRange: ["21:00", "05:00"] }, theme: { mode: "dark", primary: "#EC4899", accent: "#FBCFE8", bg: "#0F172A", text: "#F8FAFC" }, featuredTags: ["special", "dessert", "popular"], priority: 0, restaurantId: restaurant.id },
    ],
  });

  // Create test tables and one sample waiter call.
  const table1 = await prisma.restaurantTable.create({
    data: { number: 1, label: "Window", restaurantId: restaurant.id },
  });
  await prisma.restaurantTable.create({
    data: { number: 2, label: "Family", restaurantId: restaurant.id },
  });
  await prisma.restaurantTable.create({
    data: { number: 3, label: "Patio", restaurantId: restaurant.id },
  });

  await prisma.waiterCall.create({
    data: {
      status: "PENDING",
      message: "Need water refill",
      tableId: table1.id,
      restaurantId: restaurant.id,
    },
  });

  console.log("Seeded requested test restaurant with menu items, rules, and tables");
  console.log("\n--- Login Credentials ---");
  console.log("Super Admin: ayush85.dev@gmail.com / Admin@123");
  console.log("Admin User:  ayushrestha8585@gmail.com / admin@123");
  console.log("Restaurant:  Ayush Test Kitchen (slug: ayush-test-kitchen)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
