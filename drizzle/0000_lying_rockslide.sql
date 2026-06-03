CREATE TABLE `Account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Campaign` (
	`id` text PRIMARY KEY NOT NULL,
	`ownerId` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`targetLang` text NOT NULL,
	`targetLangName` text,
	`pivotLang` text DEFAULT 'en' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`autoQualify` integer DEFAULT false NOT NULL,
	`budgetPoints` integer DEFAULT 0 NOT NULL,
	`spentPoints` integer DEFAULT 0 NOT NULL,
	`rewardRecord` integer DEFAULT 15 NOT NULL,
	`rewardVerify` integer DEFAULT 5 NOT NULL,
	`minVerifications` integer DEFAULT 3 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Campaign_ownerId_idx` ON `Campaign` (`ownerId`);--> statement-breakpoint
CREATE TABLE `Invite` (
	`id` text PRIMARY KEY NOT NULL,
	`campaignId` text NOT NULL,
	`role` text NOT NULL,
	`code` text NOT NULL,
	`email` text,
	`createdById` text NOT NULL,
	`usedAt` integer,
	`expiresAt` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Invite_code_unique` ON `Invite` (`code`);--> statement-breakpoint
CREATE INDEX `Invite_campaignId_idx` ON `Invite` (`campaignId`);--> statement-breakpoint
CREATE TABLE `Language` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`countries` text DEFAULT '' NOT NULL,
	`custom` integer DEFAULT false NOT NULL,
	`createdById` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Language_code_unique` ON `Language` (`code`);--> statement-breakpoint
CREATE TABLE `MagicLink` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`campaignId` text NOT NULL,
	`role` text NOT NULL,
	`name` text,
	`email` text,
	`phone` text,
	`userId` text,
	`createdById` text NOT NULL,
	`expiresAt` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `MagicLink_token_unique` ON `MagicLink` (`token`);--> statement-breakpoint
CREATE INDEX `MagicLink_campaignId_idx` ON `MagicLink` (`campaignId`);--> statement-breakpoint
CREATE TABLE `Membership` (
	`id` text PRIMARY KEY NOT NULL,
	`campaignId` text NOT NULL,
	`userId` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Membership_userId_idx` ON `Membership` (`userId`);--> statement-breakpoint
CREATE INDEX `Membership_campaign_user_role_idx` ON `Membership` (`campaignId`,`userId`,`role`);--> statement-breakpoint
CREATE TABLE `PointLedger` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`campaignId` text,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`refId` text,
	`balanceAfter` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `PointLedger_user_created_idx` ON `PointLedger` (`userId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `Prompt` (
	`id` text PRIMARY KEY NOT NULL,
	`campaignId` text NOT NULL,
	`pivotText` text NOT NULL,
	`pivotLang` text DEFAULT 'en' NOT NULL,
	`targetLang` text NOT NULL,
	`domain` text,
	`sceneDescription` text,
	`imageUrl` text,
	`ttsUrl` text,
	`difficulty` text,
	`targetN` integer DEFAULT 3 NOT NULL,
	`status` text DEFAULT 'live' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`createdById` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Prompt_campaign_status_idx` ON `Prompt` (`campaignId`,`status`);--> statement-breakpoint
CREATE TABLE `Recording` (
	`id` text PRIMARY KEY NOT NULL,
	`promptId` text NOT NULL,
	`campaignId` text NOT NULL,
	`speakerId` text NOT NULL,
	`audioUrl` text NOT NULL,
	`rawKey` text,
	`cleanKey` text,
	`qualityMetrics` text,
	`rawDeleted` integer DEFAULT false NOT NULL,
	`deliveredToDrive` integer DEFAULT false NOT NULL,
	`mimeType` text DEFAULT 'audio/webm' NOT NULL,
	`durationMs` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`score` real,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`promptId`) REFERENCES `Prompt`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Recording_campaign_status_idx` ON `Recording` (`campaignId`,`status`);--> statement-breakpoint
CREATE INDEX `Recording_promptId_idx` ON `Recording` (`promptId`);--> statement-breakpoint
CREATE TABLE `Redemption` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`campaignId` text NOT NULL,
	`rewardId` text,
	`rewardTitle` text,
	`points` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`note` text,
	`handledById` text,
	`handledAt` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Redemption_campaign_status_idx` ON `Redemption` (`campaignId`,`status`);--> statement-breakpoint
CREATE INDEX `Redemption_userId_idx` ON `Redemption` (`userId`);--> statement-breakpoint
CREATE TABLE `Reward` (
	`id` text PRIMARY KEY NOT NULL,
	`campaignId` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`costPoints` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Reward_campaignId_idx` ON `Reward` (`campaignId`);--> statement-breakpoint
CREATE TABLE `Session` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`emailVerified` integer,
	`image` text,
	`locale` text DEFAULT 'en' NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);--> statement-breakpoint
CREATE TABLE `VerificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `Verification` (
	`id` text PRIMARY KEY NOT NULL,
	`recordingId` text NOT NULL,
	`verifierId` text NOT NULL,
	`verdict` text NOT NULL,
	`comment` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`recordingId`) REFERENCES `Recording`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Verification_recording_verifier_idx` ON `Verification` (`recordingId`,`verifierId`);--> statement-breakpoint
CREATE INDEX `Verification_verifierId_idx` ON `Verification` (`verifierId`);