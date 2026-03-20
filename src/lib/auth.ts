import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

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

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (user?.password && user.isActive) {
          const isValid = await bcrypt.compare(password, user.password);
          if (isValid) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              actorType: "USER" as const,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.actorType = token.actorType as "USER" | "STAFF" | undefined;
        session.user.restaurantId = token.restaurantId as string | undefined;
      }
      return session;
    },
  },
});
