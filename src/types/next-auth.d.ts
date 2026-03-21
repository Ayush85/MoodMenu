import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    actorType?: "USER" | "STAFF";
    restaurantId?: string;
    restaurantIds?: string[];
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      actorType?: "USER" | "STAFF";
      restaurantId?: string;
      restaurantIds?: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    actorType?: "USER" | "STAFF";
    restaurantId?: string;
    restaurantIds?: string[];
  }
}
