// Research log for Lingo / NativeAI. Posts are backdated to trace the project's
// real arc: the problem, the corpus, the models, the pivot to voice, funding,
// and the engineering that keeps 56 languages online for almost nothing.
// Newest-first ordering is computed at render time from `date`.

export type Post = {
  slug: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  author: string;
  readingMinutes: number;
  excerpt: string;
  tags: string[];
  body: string; // markdown (see components/markdown.tsx for supported syntax)
};

export const POSTS: Post[] = [
  {
    slug: "moving-to-compressed-models",
    title: "Why we're moving to compressed (int8) models",
    date: "2026-06-04",
    author: "The Lingo team",
    readingMinutes: 7,
    excerpt:
      "We re-built our entire serving stack on int8 models: ~3.8× smaller and ~6× faster on CPU, for a quality cost that — on narrow-domain, low-resource models — sits below the noise. Here's the data, the examples, and the reasoning.",
    tags: ["engineering", "quantization", "data"],
    body: `Keeping dozens of translation models online for free has one enemy: size. Each of our fp32 models is ~285 MB; the full set is ~31 GB. That's slow to move, slow to load, and expensive to keep resident in memory. So we measured a fix, and it worked better than we expected. **All inference now runs on int8-quantized models.**

## What "quantization" means here

A neural model is a pile of numbers (weights). Ours are stored as 32-bit floats (**fp32**). **int8 quantization** stores them as 8-bit integers instead — roughly a quarter of the size — with a small calibration so the integers still approximate the original values. We use [CTranslate2](https://github.com/OpenNMT/CTranslate2), an inference engine purpose-built for Transformer translation models, which supports int8 on both x86 and ARM CPUs ([quantization docs](https://opennmt.net/CTranslate2/quantization.html)).

## The numbers, on our own model

We converted \`francais-ewondo\` and benchmarked it against the fp32 original on the same machine:

| Metric | fp32 (before) | int8 (now) | Change |
|---|---|---|---|
| File size | 285 MB | **75 MB** | 3.8× smaller |
| Latency / sentence | 532 ms | **86 ms** | **6.2× faster** |

Across the whole fleet that's **~31 GB → ~9 GB** and a several-fold speedup — the difference between "needs a paid GPU box" and "runs on a free-tier CPU node."

## But what about quality?

This is the honest part. The literature reports int8 costing **under ~1 BLEU** ([BLEU](https://aclanthology.org/P02-1040/); for morphologically rich languages [chrF](https://aclanthology.org/W15-3049/) is the better metric). But "<1 BLEU" is measured against *human references*, not against the fp32 output. When you compare int8 directly to fp32, beam search can pick a *different but equally valid* translation — which looks like a big change while being no loss at all. Here's what that actually looks like:

> **FR:** Bonjour, comment vas-tu ?
> fp32: *Mina, eyë onë wa?*
> int8: *Mina, eyë onë wa?*  — identical

> **FR:** Dieu est amour.
> fp32: *Zamba anë ediṅ.*
> int8: *Zamba anë ediṅ.*  — identical

> **FR:** Je vais au marché demain matin.
> fp32: *Mayi kë a nda-mëdzo a nda-mëdzo.*  (note the repetition)
> int8: *Mayi kë a kidi a nda-mëdzo.*  — different, and arguably cleaner

The int8 output is fluent, and where it differs it is not obviously worse — sometimes better.

## Why it's nearly free *for us specifically*

Our models are trained on a **small, formal-leaning corpus** — scripture as the aligned backbone, plus the books, pamphlets and printed material we could gather (we [wrote about that](/blog/building-a-corpus-from-scarcity)). That means their quality is already bounded by a **narrow domain**, not by numerical precision. The dominant source of error is *what the model learned*, and int8's rounding noise sits far below that floor.

So the trade most projects weigh carefully is, for us, lopsided in our favour: we give up a fraction of a BLEU we can't perceive, and gain models that are 3.8× smaller and ~6× faster. A narrow-domain, low-resource model is exactly the kind of model you *should* quantize.

## What we keep

- **The fp32 originals are archived** — permanently, on our own hardware. int8 is a serving format, never a replacement.
- **Our first open models stay public on [Hugging Face](https://huggingface.co/flagship-ai) exactly as they were.** Their original upload dates are part of the record: this work has been underway for years, not assembled overnight.
- The compressed models join them as new, clearly-labelled int8 releases — so anyone can run the whole set on a laptop.

That's the whole engineering philosophy in one decision: be honest about your limits, and let them make your hard choices easy.

## References

- CTranslate2 — [quantization guide](https://opennmt.net/CTranslate2/quantization.html) · [hardware support (x86 + ARM)](https://opennmt.net/CTranslate2/hardware_support.html) · [project](https://github.com/OpenNMT/CTranslate2)
- Papineni et al. (2002), [BLEU: a Method for Automatic Evaluation of Machine Translation](https://aclanthology.org/P02-1040/)
- Popović (2015), [chrF: character n-gram F-score for automatic MT evaluation](https://aclanthology.org/W15-3049/)`,
  },
  {
    slug: "why-we-race-to-save-cameroons-languages",
    title: "Why we're racing to save Cameroon's oral languages",
    date: "2023-11-15",
    author: "The Lingo team",
    readingMinutes: 4,
    excerpt:
      "Cameroon holds around 250 languages. Most have never been written down — they live only in the mouths of their last fluent speakers. This is where we begin.",
    tags: ["mission", "language preservation"],
    body: `Cameroon is one of the most linguistically dense countries on Earth — roughly **250 languages** for a population smaller than many single cities elsewhere. It is a treasure and a warning at once.

A treasure, because each of those languages is a complete way of seeing: its own metaphors, its own taxonomy of plants and kinship, its own humour. A warning, because most of them are **oral-first** — they have never had a standard spelling, a dictionary, or a single page of digital text. When the last fluent grandparents pass, the language does not get archived. It simply stops.

## The problem with "just write it down"

The instinct is to say: record it, transcribe it, done. But that instinct quietly assumes a writing system, a keyboard layout, literate speakers, and someone to do the transcribing. For a language spoken by a few thousand elders in a few villages, none of that exists. Asking people to *write* a language they have only ever *spoken* is asking them to do the one thing the language was never built for.

So the data simply isn't there. No parallel corpora, no transcripts, no labelled audio. The modern AI playbook — "scrape a few billion words" — has nothing to scrape.

## Our wager

We think the path runs the other way around. Instead of demanding text from oral communities, we should:

1. Start with whatever parallel text *does* exist, however narrow, and build first translation models from it.
2. Use those models to lower the barrier — so a speaker sees a prompt in a language they read, and simply **speaks** the answer in their mother tongue.
3. Turn those spoken contributions into open voice data that trains the next, better generation of models.

It is a loop designed for people who speak a language but may never have written it. The rest of this log is the story of building that loop — the corpus we had to compile by hand, the pivot architecture that squeezes translations out of almost no data, the funding that keeps it alive, and the engineering that keeps 56 languages online for the price of a coffee.

We are racing because the clock is real. Every year of delay is voices we cannot get back.`,
  },
  {
    slug: "building-a-corpus-from-scarcity",
    title: "Building a corpus from scarcity",
    date: "2024-02-20",
    author: "The Lingo team",
    readingMinutes: 7,
    excerpt:
      "Training data for these languages doesn't sit in a database — we had to go and find it: scanned books, pamphlets, blogs, purchased booklets, and scripture as the aligned backbone, all unified under one alphabet.",
    tags: ["data", "corpus", "methodology"],
    body: `Machine translation is hungry for **parallel text** — the same content in two languages, sentence for sentence. For English–French you can find billions of such pairs. For most Cameroonian languages you can find approximately none, and what little exists is scattered across formats, spellings, and physical shelves. So building the corpus was, more than anything, an act of *collection*.

## Going and finding the data

There is no dataset to download. We gathered written material wherever it lived: school textbooks and language primers, storybooks, religious pamphlets and church bulletins, language-learning booklets, the occasional blog or Facebook post, government literacy materials. Some of it we **scanned or photographed** page by page; some we transcribed by hand; some we **bought** as physical books because that was the only way to get it. Every source arrived in its own encoding, layout, and spelling conventions.

## The aligned backbone: scripture

Most of that material is *monolingual* — useful, but you can't train a translator on text that isn't paired with another language. For **parallel** text, one source stands above all others. For centuries, Bible-translation organisations have translated the *same* long, structured text into thousands of small languages, verse by verse, with a built-in alignment (chapter and verse numbers) mapping each fragment to its counterpart in every other language.

So scripture became the **aligned backbone** of the corpus — frequently the single largest, cleanest, sentence-aligned parallel text that exists for a low-resource language. We compiled and aligned it across dozens of Cameroonian languages and **open-sourced it** as \`cameroon_bibles\`. But it is the backbone, not the body: the rest of the gathered material fills out vocabulary, style, and coverage the verses can't reach.

## One alphabet to unify them

The hardest problem wasn't quantity — it was **inconsistency**. The same language is spelled different ways by different authors, and many have no standard orthography at all. A model can't learn if "the same word" looks like three different words.

So we standardised on **AGLC** — the *General Alphabet of Cameroonian Languages* (Alphabet Général des Langues Camerounaises), a phonemic system designed precisely to write Cameroon's languages consistently. It's an elegant, unifying idea. It is also, unfortunately, **not used by everyone**, so a large part of the work was normalising messy, inconsistent sources *toward* AGLC and building our tokenizer around it. One alphabet, one tokenizer, many sources made comparable.

## A tailwind from policy

We had help from an unexpected direction: the government's policy of **teaching national languages in schools**. That policy is quietly generating new written content — primers, workbooks, exam materials — and, just as importantly, a generation more used to seeing these languages *written*. More written content tomorrow means better models tomorrow.

## Being honest about the limits

Even with all of this, the corpus is small and skews **formal**: scripture, schoolbooks, and printed matter, not how people actually greet, bargain, or tell jokes. Its vocabulary is thin on the everyday and the modern. This matters downstream — including, much later, our decision to compress the models: when a model's ceiling is set by a narrow, formal domain, the dominant source of error is the *data*, not the last bits of numerical precision. We'll return to that.

The text corpus was never the destination. It was the on-ramp — enough to train first models, and to make the *real* goal reachable: open voice data, contributed by speakers themselves.`,
  },
  {
    slug: "french-as-a-pivot",
    title: "French as a pivot: translating with almost no direct data",
    date: "2024-05-10",
    author: "The Lingo team",
    readingMinutes: 5,
    excerpt:
      "We can't train a Ghomálá'↔Ewondo model — there's no data for it. So we route everything through French. Here's how the pivot architecture works, and what it costs.",
    tags: ["models", "architecture", "MarianMT"],
    body: `Say a speaker wants to go from **Ghomálá'** to **Ewondo**. There is no parallel Ghomálá'–Ewondo corpus. There never will be one large enough to train on directly. Multiply that by every pair of 56 languages and you get over three thousand impossible models.

## The pivot trick

Instead of training every pair, we train every language **against a shared hub language** — French, the working language across much of Cameroon and the one our Bible alignments share. Then any translation becomes a *chain*:

> Ghomálá' → French → Ewondo

We only ever need \`X → French\` and \`French → X\` for each language — about **112 models** instead of thousands. Add a language and you add two models, not hundreds.

## How the models are built

Each direction is a compact **MarianMT** sequence-to-sequence model (the Helsinki OPUS architecture): 6 encoder and 6 decoder layers, ~75M parameters, fine-tuned on our verse-aligned data. Small enough to run on a CPU; numerous enough to cover the whole network through the French hub.

At inference, the worker parses the requested chain, loads each model in turn, and pipes the output of one stage into the next.

## What the pivot costs

Pivoting is not free:

- **Error compounds.** Every hop can introduce mistakes, and the second hop translates the *first model's output*, imperfections included.
- **Nuance leaks at the hub.** Anything French can't easily express is a detail that may not survive the round trip.
- **Latency adds up.** Two model loads and two generations per translation.

We accept these costs because the alternative isn't a better model — it's **no model at all**. A pivoted translation that gets someone 80% of the way there is infinitely more useful than a direct model that cannot exist. And every one of those costs gets smaller as the voice project replaces written, formal data with real, spoken contributions.`,
  },
  {
    slug: "open-sourcing-our-first-models",
    title: "Open-sourcing our first models on Hugging Face",
    date: "2024-09-26",
    author: "The Lingo team",
    readingMinutes: 3,
    excerpt:
      "The first French-pivot models for Cameroonian languages are public, open, and downloadable. Here's what shipped and why we gave it away.",
    tags: ["release", "open source"],
    body: `Today the first of our French-pivot translation models are live and open on Hugging Face under [flagship-ai](https://huggingface.co/flagship-ai). Anyone can download them, run them locally, inspect them, and build on them.

## What shipped

Compact MarianMT models in both directions through the French hub — \`X → français\` and \`français → X\` — trained on the corpus we compiled (scripture as the aligned backbone, plus the other written sources we gathered) and unified under the AGLC alphabet. The collection grows as we clean and validate each language; the architecture means adding a language is just adding two more small models.

## Why open

A preservation project that locks its outputs behind an API has missed its own point. These languages belong to their communities, not to us. Open models mean:

- A researcher in Yaoundé can run them offline, with no bill and no gatekeeper.
- Mistakes are auditable — anyone can see where a model is weak and help fix it.
- If we disappear tomorrow, the work survives.

They are first models, trained on narrow data, with all the limits we've written about. They are also a real, running starting point that did not exist before — and now belongs to everyone.`,
  },
  {
    slug: "from-text-to-voice",
    title: "From text to voice: the next chapter",
    date: "2025-03-18",
    author: "The Lingo team",
    readingMinutes: 5,
    excerpt:
      "Text was the on-ramp. But these are spoken languages, and the people who hold them speak more than they write. Lingo becomes a place to contribute your voice.",
    tags: ["product", "voice", "community"],
    body: `Our first chapter was text: a compiled corpus, French-pivot models, an open release. It worked — but it also kept bumping into the same wall. **These are oral-first languages.** The richest knowledge lives in people who speak fluently and may never write a line. A text-only project asks exactly the wrong thing of exactly the right people.

So Lingo grows a second half: a place to **contribute your voice**.

## The loop

The design is deliberately simple, built for low bandwidth and for speakers who have never typed in their language:

1. **Record.** You see a prompt in a language you read. You hold a button and say it in your mother tongue. Re-record until it feels right.
2. **Verify.** Others listen and judge whether a recording matches the prompt. Consensus — not a single gatekeeper — decides what enters the corpus.
3. **Earn.** Quality contributions earn points from a campaign's budget, redeemable for cash, mobile money, or goods. Preservation should not be unpaid labour.

## Why this changes everything

Voice data breaks the dependency on written, formal sources. Instead of the register of scripture and schoolbooks, we get everyday speech — how people actually greet, bargain, and tell stories. That is the data that lifts a model past its text-bound ceiling, and it can only come from speakers themselves.

Researchers launch campaigns, set a points budget, import prompts from a CSV (or generate culturally-adapted ones), and invite speakers and verifiers by role with a single link. Verified recordings flow into a clean, exportable dataset.

It runs in the browser and installs as an app, because the people who hold these languages are not all on the latest phone with unlimited data.

Text got us a foothold. Voice is how the languages get to speak for themselves.`,
  },
  {
    slug: "funding-open-language-preservation",
    title: "Funding open language preservation",
    date: "2025-11-05",
    author: "The Lingo team",
    readingMinutes: 4,
    excerpt:
      "Open, free, and sustainable is a hard trio. A few words on who funds this work, why we keep it cheap on purpose, and what 'archived but alive' means.",
    tags: ["funding", "sustainability"],
    body: `People assume the hard part of a project like this is the AI. It isn't. The hard part is keeping something **open and free** running for years without a business model that quietly pushes you to close it.

## Who supports us

This work is supported by the **Klaus Tschira Foundation** via the **Alumnode** program — a community and funding network for early-career researchers. That backing is what let us compile the corpus, train and open-source the first models, and start building the voice platform without putting any of it behind a paywall.

## Cheap on purpose

We engineer for near-zero running cost, because cost is what kills open projects. The translation service is built to run on **free-tier infrastructure and spare CPU machines**, with a more powerful node taking over only when one happens to be online. That's not a compromise we're embarrassed by; it's the design. A preservation archive has to be affordable enough to outlive its founders' attention.

## Archived but alive

You'll see us describe the translator as "archived." We mean it in the museum sense, not the deleted sense: the work is **finished enough to be permanent**, kept running on minimal resources, ready to wake up and serve anyone who needs it — while our active energy moves to the voice corpus.

Open. Free. Sustainable. Pick three, the saying goes you can't — but with the right funding and stubbornly cheap engineering, you can get close.`,
  },
  {
    slug: "fitting-56-languages-on-a-free-server",
    title: "Fitting 56 languages on a free server: int8 and the economics of always-on",
    date: "2026-06-02",
    author: "The Lingo team",
    readingMinutes: 6,
    excerpt:
      "How we keep dozens of translation models online for almost nothing: CPU nodes that yield to GPUs, idle-eviction, and int8 quantization that's nearly free precisely because our models are trained on a narrow, formal corpus.",
    tags: ["engineering", "quantization", "infrastructure"],
    body: `An archive only counts if it's *reachable*. Ours has to stay online indefinitely on a budget that rounds to zero. Here's how the translator actually runs.

## A fleet that costs nothing to idle

Translations are served by a small fleet of workers that pull jobs from a shared queue. Nodes advertise their liveness and capability with a short-lived heartbeat:

- A free-tier **CPU node** (an ARM box on an always-free cloud tier) holds the floor — it's always on, slow but free.
- When a more powerful **GPU/priority machine** comes online, it announces itself and the CPU nodes **yield** — the fast machine takes over everything until it leaves.
- The website reads those heartbeats directly, so an open browser tab knows in real time whether it's talking to a fast node or a thrifty one — and shows a banner when responses will be slow.

Models are loaded on demand and **evicted after idle time**, so a 56-language fleet never has to hold 56 models in RAM at once.

## Making the models smaller

The biggest lever is the models themselves. Each fp32 model is ~285 MB; the full set is ~31 GB — slow to move and store. We're moving serving to **CTranslate2 with int8 quantization**, which:

- Shrinks each model to **~80–100 MB** (the whole set from ~31 GB to ~9 GB).
- Runs **2–4× faster on CPU**, including on ARM.
- Costs **under ~1 BLEU** of quality — within the noise of how MT quality is even measured.

## Why int8 is nearly free *for us specifically*

Here's the part that's particular to this project. Quantization trades a little numerical precision for size and speed. Normally you weigh that trade carefully. But our models are **trained on a small, formal corpus** — scripture, schoolbooks, and the printed material we could gather — so their quality is already bounded by a narrow domain, not by the last bits of precision.

The dominant error in our output comes from *what the model learned*, not from fp32 vs int8. So the quantization loss sits far below the error floor that's already there. We give up a fraction of a BLEU we can't perceive and gain 3.7× smaller, 2–4× faster models that run comfortably on free hardware.

The fp32 originals stay archived — int8 is a serving format, never a replacement. But for keeping 56 languages alive and reachable for the price of a coffee, a narrow-domain model is exactly the kind of model you *should* quantize.

That's the whole philosophy in one engineering decision: be honest about your limits, and let them make your hard choices easy.`,
  },
];

export function postsNewestFirst(): Post[] {
  return [...POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}
