import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "../db/drizzle";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import authConfig from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      // Check if user exists and is active
      if (user.email) {
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (existingUser.length > 0) {
          // User exists, check if active
          const dbUser = existingUser[0];
          if (!dbUser.active) {
            // User account is deactivated, prevent signin
            console.log(`Signin blocked for deactivated account: ${user.email}`);
            return false;
          }
        }
      }
      
      return true;
    },
  },
});
