import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const now = () => ts("createdAt").notNull().$defaultFn(() => new Date());

// ---------- Auth.js ----------
export const users = sqliteTable("User", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: ts("emailVerified"),
  image: text("image"),
  locale: text("locale").notNull().default("en"),
  createdAt: now(),
});

export const accounts = sqliteTable(
  "Account",
  {
    userId: text("userId")
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
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = sqliteTable("Session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: ts("expires").notNull(),
});

export const verificationTokens = sqliteTable(
  "VerificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: ts("expires").notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---------- Domain ----------
export const languages = sqliteTable("Language", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  countries: text("countries").notNull().default(""),
  custom: integer("custom", { mode: "boolean" }).notNull().default(false),
  createdById: text("createdById"),
  createdAt: now(),
});

export const campaigns = sqliteTable(
  "Campaign",
  {
    id: id(),
    ownerId: text("ownerId").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    targetLang: text("targetLang").notNull(),
    targetLangName: text("targetLangName"),
    pivotLang: text("pivotLang").notNull().default("en"),
    status: text("status").notNull().default("active"),
    visibility: text("visibility").notNull().default("private"),
    autoQualify: integer("autoQualify", { mode: "boolean" })
      .notNull()
      .default(false),
    budgetPoints: integer("budgetPoints").notNull().default(0),
    spentPoints: integer("spentPoints").notNull().default(0),
    rewardRecord: integer("rewardRecord").notNull().default(15),
    rewardVerify: integer("rewardVerify").notNull().default(5),
    minVerifications: integer("minVerifications").notNull().default(3),
    createdAt: now(),
    updatedAt: ts("updatedAt").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("Campaign_ownerId_idx").on(t.ownerId)],
);

export const memberships = sqliteTable(
  "Membership",
  {
    id: id(),
    campaignId: text("campaignId")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: now(),
  },
  (t) => [
    index("Membership_userId_idx").on(t.userId),
    index("Membership_campaign_user_role_idx").on(
      t.campaignId,
      t.userId,
      t.role,
    ),
  ],
);

export const invites = sqliteTable(
  "Invite",
  {
    id: id(),
    campaignId: text("campaignId")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    code: text("code").notNull().unique(),
    email: text("email"),
    createdById: text("createdById").notNull(),
    usedAt: ts("usedAt"),
    expiresAt: ts("expiresAt"),
    createdAt: now(),
  },
  (t) => [index("Invite_campaignId_idx").on(t.campaignId)],
);

export const magicLinks = sqliteTable(
  "MagicLink",
  {
    id: id(),
    token: text("token").notNull().unique(),
    campaignId: text("campaignId")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    userId: text("userId"),
    createdById: text("createdById").notNull(),
    expiresAt: ts("expiresAt"),
    createdAt: now(),
  },
  (t) => [index("MagicLink_campaignId_idx").on(t.campaignId)],
);

export const prompts = sqliteTable(
  "Prompt",
  {
    id: id(),
    campaignId: text("campaignId")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    pivotText: text("pivotText").notNull(),
    pivotLang: text("pivotLang").notNull().default("en"),
    targetLang: text("targetLang").notNull(),
    domain: text("domain"),
    sceneDescription: text("sceneDescription"),
    imageUrl: text("imageUrl"),
    ttsUrl: text("ttsUrl"),
    difficulty: text("difficulty"),
    targetN: integer("targetN").notNull().default(3),
    status: text("status").notNull().default("live"),
    source: text("source").notNull().default("manual"),
    createdById: text("createdById"),
    createdAt: now(),
  },
  (t) => [index("Prompt_campaign_status_idx").on(t.campaignId, t.status)],
);

export const recordings = sqliteTable(
  "Recording",
  {
    id: id(),
    promptId: text("promptId")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    campaignId: text("campaignId")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    speakerId: text("speakerId").notNull(),
    audioUrl: text("audioUrl").notNull(),
    rawKey: text("rawKey"),
    cleanKey: text("cleanKey"),
    qualityMetrics: text("qualityMetrics"),
    rawDeleted: integer("rawDeleted", { mode: "boolean" })
      .notNull()
      .default(false),
    deliveredToDrive: integer("deliveredToDrive", { mode: "boolean" })
      .notNull()
      .default(false),
    mimeType: text("mimeType").notNull().default("audio/webm"),
    durationMs: integer("durationMs").notNull().default(0),
    status: text("status").notNull().default("ready"),
    score: real("score"),
    createdAt: now(),
  },
  (t) => [
    index("Recording_campaign_status_idx").on(t.campaignId, t.status),
    index("Recording_promptId_idx").on(t.promptId),
  ],
);

export const verifications = sqliteTable(
  "Verification",
  {
    id: id(),
    recordingId: text("recordingId")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),
    verifierId: text("verifierId").notNull(),
    verdict: text("verdict").notNull(),
    comment: text("comment"),
    createdAt: now(),
  },
  (t) => [
    index("Verification_recording_verifier_idx").on(
      t.recordingId,
      t.verifierId,
    ),
    index("Verification_verifierId_idx").on(t.verifierId),
  ],
);

export const pointLedger = sqliteTable(
  "PointLedger",
  {
    id: id(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaignId: text("campaignId"),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    refId: text("refId"),
    balanceAfter: integer("balanceAfter").notNull(),
    createdAt: now(),
  },
  (t) => [index("PointLedger_user_created_idx").on(t.userId, t.createdAt)],
);

export const rewards = sqliteTable(
  "Reward",
  {
    id: id(),
    campaignId: text("campaignId")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    costPoints: integer("costPoints").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: now(),
  },
  (t) => [index("Reward_campaignId_idx").on(t.campaignId)],
);

export const redemptions = sqliteTable(
  "Redemption",
  {
    id: id(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaignId: text("campaignId").notNull(),
    rewardId: text("rewardId"),
    rewardTitle: text("rewardTitle"),
    points: integer("points").notNull(),
    status: text("status").notNull().default("open"),
    note: text("note"),
    handledById: text("handledById"),
    handledAt: ts("handledAt"),
    createdAt: now(),
  },
  (t) => [
    index("Redemption_campaign_status_idx").on(t.campaignId, t.status),
    index("Redemption_userId_idx").on(t.userId),
  ],
);

// ---------- relations (for include-style reads) ----------
export const usersRelations = relations(users, ({ many }) => ({
  ownedCampaigns: many(campaigns),
  memberships: many(memberships),
  recordings: many(recordings),
  verifications: many(verifications),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  owner: one(users, { fields: [campaigns.ownerId], references: [users.id] }),
  memberships: many(memberships),
  prompts: many(prompts),
  recordings: many(recordings),
  invites: many(invites),
  rewards: many(rewards),
  redemptions: many(redemptions),
  magicLinks: many(magicLinks),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [memberships.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [prompts.campaignId],
    references: [campaigns.id],
  }),
  recordings: many(recordings),
}));

export const recordingsRelations = relations(recordings, ({ one, many }) => ({
  prompt: one(prompts, {
    fields: [recordings.promptId],
    references: [prompts.id],
  }),
  campaign: one(campaigns, {
    fields: [recordings.campaignId],
    references: [campaigns.id],
  }),
  speaker: one(users, {
    fields: [recordings.speakerId],
    references: [users.id],
  }),
  verifications: many(verifications),
}));

export const verificationsRelations = relations(verifications, ({ one }) => ({
  recording: one(recordings, {
    fields: [verifications.recordingId],
    references: [recordings.id],
  }),
  verifier: one(users, {
    fields: [verifications.verifierId],
    references: [users.id],
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [invites.campaignId],
    references: [campaigns.id],
  }),
}));

export const magicLinksRelations = relations(magicLinks, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [magicLinks.campaignId],
    references: [campaigns.id],
  }),
}));

export const rewardsRelations = relations(rewards, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [rewards.campaignId],
    references: [campaigns.id],
  }),
  redemptions: many(redemptions),
}));

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  user: one(users, { fields: [redemptions.userId], references: [users.id] }),
  campaign: one(campaigns, {
    fields: [redemptions.campaignId],
    references: [campaigns.id],
  }),
  reward: one(rewards, {
    fields: [redemptions.rewardId],
    references: [rewards.id],
  }),
}));
