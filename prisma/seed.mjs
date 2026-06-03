// Seeds a demo campaign with prompts and contributors.
// Run: npx prisma db seed   (loads .env automatically)
import pkg from "../src/generated/prisma/index.js";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

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
  ["Good morning, did you sleep well?", "greetings", "Morning greeting between neighbours"],
];

async function main() {
  const researcher = await prisma.user.upsert({
    where: { email: "researcher@lingo.dev" },
    update: {},
    create: { email: "researcher@lingo.dev", name: "Amina (Researcher)" },
  });
  const speaker = await prisma.user.upsert({
    where: { email: "speaker@lingo.dev" },
    update: {},
    create: { email: "speaker@lingo.dev", name: "Tabi (Speaker)" },
  });
  const verifier = await prisma.user.upsert({
    where: { email: "verifier@lingo.dev" },
    update: {},
    create: { email: "verifier@lingo.dev", name: "Ngozi (Verifier)" },
  });

  // Avoid duplicating the demo campaign on re-seed.
  const existing = await prisma.campaign.findFirst({
    where: { ownerId: researcher.id, title: "Everyday Bafia — greetings & market" },
  });
  if (existing) {
    console.log("Demo campaign already seeded:", existing.id);
    return;
  }

  const campaign = await prisma.campaign.create({
    data: {
      ownerId: researcher.id,
      title: "Everyday Bafia — greetings & market",
      description:
        "Short everyday phrases to bootstrap a Bafia voice corpus. Prompts shown in English.",
      targetLang: "bafia",
      pivotLang: "en",
      budgetPoints: 5000,
      rewardRecord: 15,
      rewardVerify: 5,
      minVerifications: 2,
      memberships: {
        create: [
          { userId: researcher.id, role: "owner" },
          { userId: speaker.id, role: "speaker" },
          { userId: verifier.id, role: "verifier" },
          { userId: researcher.id, role: "verifier" },
        ],
      },
      prompts: {
        create: PROMPTS.map(([pivotText, domain, sceneDescription]) => ({
          pivotText,
          domain,
          sceneDescription,
          pivotLang: "en",
          targetLang: "bafia",
          source: "manual",
          createdById: researcher.id,
        })),
      },
    },
  });

  console.log("Seeded demo campaign:", campaign.id);
  console.log("Sign in (dev login) as any of:");
  console.log("  researcher@lingo.dev · speaker@lingo.dev · verifier@lingo.dev");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
