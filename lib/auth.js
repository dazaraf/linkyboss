import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verifyMessage } from "viem";
import { db } from "./db";
import { users, accounts, sessions, verificationTokens } from "./db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    Credentials({
      id: "wallet",
      name: "wallet",
      credentials: {
        address: { label: "Wallet Address", type: "text" },
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.address || !credentials?.message || !credentials?.signature) {
          return null;
        }

        try {
          // Verify the signature matches the address
          const valid = await verifyMessage({
            address: credentials.address,
            message: credentials.message,
            signature: credentials.signature,
          });

          if (!valid) {
            return null;
          }

          const walletAddress = credentials.address.toLowerCase();

          // Look up existing user by wallet address
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.walletAddress, walletAddress))
            .limit(1);

          if (existingUser) {
            return {
              id: existingUser.id,
              name: existingUser.name || walletAddress,
              email: existingUser.email,
              image: existingUser.image,
            };
          }

          // Create a new user with this wallet address
          const [newUser] = await db
            .insert(users)
            .values({
              walletAddress,
              name: `${credentials.address.slice(0, 6)}...${credentials.address.slice(-4)}`,
            })
            .returning();

          return {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            image: newUser.image,
          };
        } catch (error) {
          console.error("Wallet auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
