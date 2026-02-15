import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

// ── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("passwordHash"),
  walletAddress: text("walletAddress").unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

// ── Accounts ────────────────────────────────────────────────────────────────
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    uniqueIndex("provider_providerAccountId_unique").on(
      table.provider,
      table.providerAccountId
    ),
  ]
);

// ── Sessions ────────────────────────────────────────────────────────────────
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// ── Verification Tokens ─────────────────────────────────────────────────────
export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ]
);

// ── Voice Profiles ─────────────────────────────────────────────────────────
export const voiceProfiles = pgTable("voiceProfiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  profileData: jsonb("profileData"),
  generatedProfile: text("generatedProfile"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

// ── Post Drafts ───────────────────────────────────────────────────────────
export const postDrafts = pgTable("postDrafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  voiceProfileId: uuid("voiceProfileId")
    .references(() => voiceProfiles.id, { onDelete: "set null" }),
  postType: text("postType").notNull(),
  topic: text("topic").notNull(),
  additionalContext: text("additionalContext"),
  generatedContent: text("generatedContent").notNull(),
  editedContent: text("editedContent"),
  authenticityScore: integer("authenticityScore"),
  authenticityFlags: jsonb("authenticityFlags"),
  status: text("status").default("draft").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});
