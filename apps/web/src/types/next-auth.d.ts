import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: number;
    };
  }

  interface User {
    role?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: number;
  }
}
