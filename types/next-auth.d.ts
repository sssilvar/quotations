import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    username?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      username?: string | null;
      name?: string | null;
      lastName?: string | null;
      email?: string | null;
      image?: string | null;
      avatarUrl?: string | null;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    username?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  }
}
