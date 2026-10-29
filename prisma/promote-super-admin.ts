// Usage: npx tsx prisma/promote-super-admin.ts someone@example.com
// Promotes an EXISTING user to SUPER_ADMIN. Never creates a user and never
// touches passwords, so a mistyped email fails instead of creating an account.
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const email = process.argv[2]?.toLowerCase().trim();
if (!email) {
  console.error("Usage: npx tsx prisma/promote-super-admin.ts <email>");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email ${email}. Nothing changed.`);
    process.exit(1);
  }
  if (user.role === "SUPER_ADMIN") {
    console.log(`${email} is already SUPER_ADMIN.`);
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "SUPER_ADMIN", isActive: true },
  });
  console.log(`${email}: ${user.role} -> SUPER_ADMIN. Sign out and back in to refresh the session.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
