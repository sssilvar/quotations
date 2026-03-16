import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import * as bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getUserAvatarUrl } from "./user-avatar";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: { username: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });
        if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash)))
          return null;
        return {
          id: user.id,
          username: user.username,
          name: user.name ?? user.username,
          lastName: user.lastName,
          email: user.email,
          image: getUserAvatarUrl(user),
          avatarUrl: user.avatarUrl,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.username = user.username;
        token.lastName = user.lastName;
        token.avatarUrl = user.avatarUrl;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.username = (token.username as string | null | undefined) ?? null;
        session.user.name = token.name ?? null;
        session.user.lastName = (token.lastName as string | null | undefined) ?? null;
        session.user.email = token.email ?? null;
        session.user.image = token.picture ?? null;
        session.user.avatarUrl = (token.avatarUrl as string | null | undefined) ?? null;
        session.user.role = (token.role as string) ?? "engineer";
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
};
