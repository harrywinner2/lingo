// Seeds the local dev SQLite DB (dev.db) with a demo campaign.
// Run: npm run db:seed
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const db = new Database(process.env.SEED_DB || "dev.db");
const now = Date.now();
const uid = () => randomUUID();

function user(email, name) {
  const existing = db.prepare("SELECT id FROM User WHERE email=?").get(email);
  if (existing) return existing.id;
  const id = uid();
  db.prepare(
    "INSERT INTO User (id,name,email,locale,createdAt) VALUES (?,?,?,?,?)",
  ).run(id, name, email, "en", now);
  return id;
}

const PROMPTS = [
  ["Where are you from?", "greetings", "Two people meeting at a market"],
  ["How much does this cost?", "market", "Buying tomatoes from a vendor"],
  ["What is your name?", "greetings", "Introducing yourself to an elder"],
  ["I am going to the farm.", "daily life", "Heading out in the morning"],
  ["The water is very cold.", "daily life", "By the river at dawn"],
  ["My family is well, thank you.", "greetings", "Answering a friend"],
  ["Please sit down.", "hospitality", "Welcoming a guest into a home"],
  ["The children are playing outside.", "daily life", "A courtyard in the evening"],
  ["Tomorrow is market day.", "market", "Planning the week"],
  ["Good morning, did you sleep well?", "greetings", "Morning greeting"],
];
const REWARDS = [
  ["1,000 XAF mobile money", "Sent via MTN/Orange Money", 100],
  ["5,000 XAF mobile money", "Sent via MTN/Orange Money", 450],
  ["Bag of rice (5kg)", "Collected at the community centre", 300],
];

const researcher = user("researcher@lingo.dev", "Amina (Researcher)");
const speaker = user("speaker@lingo.dev", "Tabi (Speaker)");
const verifier = user("verifier@lingo.dev", "Ngozi (Verifier)");

const title = "Everyday Bafia — greetings & market";
const existing = db
  .prepare("SELECT id FROM Campaign WHERE title=? AND ownerId=?")
  .get(title, researcher);
if (existing) {
  console.log("Demo campaign already seeded:", existing.id);
  process.exit(0);
}

const campaignId = uid();
db.prepare(
  `INSERT INTO Campaign (id,ownerId,title,description,targetLang,targetLangName,pivotLang,status,visibility,autoQualify,budgetPoints,spentPoints,rewardRecord,rewardVerify,minVerifications,createdAt,updatedAt)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
).run(
  campaignId, researcher, title,
  "Short everyday phrases to bootstrap a Bafia voice corpus. Prompts shown in English.",
  "bafia", "Bafia", "en", "active", "open", 1, 5000, 0, 15, 5, 2, now, now,
);

const mem = db.prepare(
  "INSERT INTO Membership (id,campaignId,userId,role,status,createdAt) VALUES (?,?,?,?,?,?)",
);
mem.run(uid(), campaignId, researcher, "owner", "active", now);
mem.run(uid(), campaignId, speaker, "speaker", "active", now);
mem.run(uid(), campaignId, verifier, "verifier", "active", now);
mem.run(uid(), campaignId, researcher, "verifier", "active", now);

const ins = db.prepare(
  "INSERT INTO Prompt (id,campaignId,pivotText,pivotLang,targetLang,domain,sceneDescription,targetN,status,source,createdById,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
);
for (const [text, domain, scene] of PROMPTS)
  ins.run(uid(), campaignId, text, "en", "bafia", domain, scene, 3, "live", "manual", researcher, now);

const rew = db.prepare(
  "INSERT INTO Reward (id,campaignId,title,description,costPoints,active,createdAt) VALUES (?,?,?,?,?,?,?)",
);
for (const [t, d, c] of REWARDS) rew.run(uid(), campaignId, t, d, c, 1, now);

console.log("Seeded demo campaign:", campaignId);
console.log("Dev-login as researcher@lingo.dev · speaker@lingo.dev · verifier@lingo.dev");
