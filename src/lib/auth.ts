import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { checkRateLimit } from "./rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        if (!checkRateLimit(`login:${email}`, 10, 15 * 60 * 1000).allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (user?.password && user.isActive) {
          const isValid = await bcrypt.compare(password, user.password);
          if (isValid) {
            const ownedRestaurants = await prisma.restaurant.findMany({
              where: { ownerId: user.id },
              select: { id: true },
              orderBy: { createdAt: "desc" },
            });

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              actorType: "USER" as const,
              restaurantIds: ownedRestaurants.map((r) => r.id),
            };
          }
        }

        const staff = await prisma.restaurantStaff.findUnique({
          where: { email },
        });

        if (!staff?.password || !staff.isActive) return null;

        const isStaffValid = await bcrypt.compare(password, staff.password);
        if (!isStaffValid) return null;

        return {
          id: staff.id,
          email: staff.email,
          name: staff.name,
          role: staff.role,
          actorType: "STAFF" as const,
          restaurantId: staff.restaurantId,
          restaurantIds: [staff.restaurantId],
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.actorType = user.actorType;
        token.restaurantId = user.restaurantId;
        token.restaurantIds = user.restaurantIds;
      } else if (typeof token.id === "string" && token.actorType === "STAFF") {
        const tokenId = token.id;
        const staff = await prisma.restaurantStaff.findUnique({
          where: { id: tokenId },
          select: { isActive: true, role: true, restaurantId: true },
        });

        if (!staff?.isActive) {
          token.id = undefined;
          token.role = undefined;
          token.actorType = undefined;
          token.restaurantId = undefined;
          token.restaurantIds = undefined;
        } else {
          token.role = staff.role;
          token.restaurantId = staff.restaurantId;
          token.restaurantIds = [staff.restaurantId];
        }
      } else if (typeof token.id === "string" && token.actorType === "USER") {
        const tokenId = token.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: tokenId },
          select: { isActive: true, role: true },
        });

        if (!dbUser?.isActive) {
          token.id = undefined;
          token.role = undefined;
          token.actorType = undefined;
          token.restaurantId = undefined;
          token.restaurantIds = undefined;
        } else {
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.actorType = token.actorType as "USER" | "STAFF" | undefined;
        session.user.restaurantId = token.restaurantId as string | undefined;
        session.user.restaurantIds = Array.isArray(token.restaurantIds)
          ? (token.restaurantIds as string[])
          : undefined;
      }
      return session;
    },
  },
});
