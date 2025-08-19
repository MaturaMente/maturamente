import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

// Edge-compatible configuration without database adapter
// This is used in middleware for authentication checks
export default {
  providers: [GitHub, Google],
  session: {
    strategy: "jwt" as const, // Required for edge middleware
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
    // Authorization callback for middleware
    authorized: async ({ auth, request: { nextUrl } }) => {
      const isLoggedIn = !!auth?.user;
      const paths = ["/dashboard"];
      const isProtected = paths.some((path) =>
        nextUrl.pathname.startsWith(path)
      );

      if (isProtected && !isLoggedIn) {
        return false; // Trigger redirect in middleware
      }

      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;


