export type Locale = "en" | "fr";
export const LOCALES: Locale[] = ["en", "fr"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lingo_locale";

const en = {
  nav: { translate: "Translate", blog: "Research log", signin: "Sign in", getStarted: "Get started", models: "Models", openApp: "Open app" },
  landing: {
    badge: "Preserving spoken-first African languages",
    title1: "Every voice keeps a",
    title2: "language alive.",
    subtitle:
      "Lingo turns spoken contributions into open voice data. Researchers launch a campaign, speakers record short phrases, the community verifies them — and everyone earns rewards. Together we build the corpora that train tomorrow's translation models.",
    startContributing: "Start contributing",
    imResearcher: "I'm a researcher",
    howTitle: "How it works",
    howSubtitle:
      "A simple loop, designed for low bandwidth and people who speak a language but may never have written it.",
    recordTitle: "1 · Record",
    recordBody:
      "See a prompt in a language you read, then hold to speak it in your mother tongue. Re-record until it feels right.",
    verifyTitle: "2 · Verify",
    verifyBody:
      "Listen to others' recordings and rate whether they match the prompt. Consensus decides what enters the corpus.",
    earnTitle: "3 · Earn",
    earnBody:
      "Quality contributions earn points from the campaign budget — redeemable for cash, mobile money, or goods.",
    forResearchers: "For researchers",
    launchTitle: "Launch a campaign in minutes",
    launchBody:
      "Pick a target language, set a points budget, and import your prompts from a CSV — or generate culturally-adapted ones with AI. Invite speakers and verifiers by role with a single link, then watch verified recordings flow into a clean, exportable dataset.",
    feat1: "CSV prompt import with live preview",
    feat2: "Roles: speaker, verifier, reviewer, manager",
    feat3: "Quality-weighted rewards & budget guardrails",
    feat4: "Works in the browser and as an installable app",
    createCampaign: "Create a campaign",
    corpusTitle: "Languages in the corpus",
    corpusGrowing: "and growing",
    rootsBadge: "Our roots",
    rootsTitle: "We started with text. You can still use it.",
    rootsBody:
      "Lingo began as lingo.cm — a cost-efficient, French-pivot machine-translation service for Cameroonian languages. We compiled its corpus by hand from every written source we could find — books, pamphlets, scanned booklets, and our open cameroon_bibles dataset — unified under a single alphabet (AGLC). Those models are open and live. The voice project is the next chapter — but the foundation is yours to use and download.",
    useTranslator: "Use the translator",
    useTranslatorDesc: "Translate text now, while a worker is online.",
    modelsCard: "Models on Hugging Face",
    modelsCardDesc: "Download & run our open Marian models.",
    datasetCard: "The cameroon_bibles dataset",
    datasetCardDesc: "Part of the corpus we compiled, open-sourced.",
    funding:
      "Supported by the Klaus Tschira Foundation via the Alumnode program.",
    footerTagline: "Built for language preservation",
  },
  translate: {
    title: "Translate Cameroonian languages",
    subtitle:
      "Our original French-pivot models — the text foundation the voice project grew from.",
    earnBanner: "Help us translate your language, and earn money!",
    placeholder: "Text to translate…",
    specialChars: "Special characters (AGLC)",
    translate: "Translate",
    translating: "Translating…",
    online: "Server online",
    asleep: "Server asleep · retry",
    checking: "Checking…",
    copy: "Copy",
    copied: "Copied",
    comment: "Leave a comment on this translation",
    noPath: "No model path between these languages.",
    asleepNotice:
      "The translation server is asleep. Languages and translation light up automatically when it's back online.",
    contributePrompt: "Want better models for your language?",
    contributeCta: "Contribute your voice →",
    cpuBanner:
      "Responses may be slow — we're running on CPU to keep the project free while it's archived. Speed returns automatically when a GPU machine comes online.",
  },
  offlineQueue: {
    pending: "{n} waiting to upload",
    syncing: "Syncing…",
    offline: "Offline — saved",
    retry: "Tap to retry",
  },
};

const fr: typeof en = {
  nav: { translate: "Traduire", blog: "Journal de recherche", signin: "Connexion", getStarted: "Commencer", models: "Modèles", openApp: "Ouvrir l'app" },
  landing: {
    badge: "Préservons les langues africaines à tradition orale",
    title1: "Chaque voix garde une",
    title2: "langue vivante.",
    subtitle:
      "Lingo transforme les contributions orales en données vocales ouvertes. Les chercheurs lancent une campagne, les locuteurs enregistrent de courtes phrases, la communauté les vérifie — et chacun gagne des récompenses. Ensemble, nous bâtissons les corpus qui entraîneront les modèles de traduction de demain.",
    startContributing: "Commencer à contribuer",
    imResearcher: "Je suis chercheur·se",
    howTitle: "Comment ça marche",
    howSubtitle:
      "Une boucle simple, pensée pour le bas débit et pour ceux qui parlent une langue sans l'avoir jamais écrite.",
    recordTitle: "1 · Enregistrer",
    recordBody:
      "Lisez une phrase dans une langue que vous lisez, puis maintenez pour la dire dans votre langue maternelle. Réenregistrez jusqu'à ce que ce soit juste.",
    verifyTitle: "2 · Vérifier",
    verifyBody:
      "Écoutez les enregistrements des autres et jugez s'ils correspondent à la phrase. Le consensus décide de ce qui entre dans le corpus.",
    earnTitle: "3 · Gagner",
    earnBody:
      "Les contributions de qualité rapportent des points du budget de la campagne — échangeables contre de l'argent, du mobile money ou des biens.",
    forResearchers: "Pour les chercheurs",
    launchTitle: "Lancez une campagne en quelques minutes",
    launchBody:
      "Choisissez une langue cible, fixez un budget de points et importez vos phrases depuis un CSV — ou générez-en avec l'IA, adaptées culturellement. Invitez locuteurs et vérificateurs par rôle via un seul lien, puis regardez les enregistrements vérifiés alimenter un jeu de données propre et exportable.",
    feat1: "Import CSV des phrases avec aperçu en direct",
    feat2: "Rôles : locuteur, vérificateur, relecteur, gestionnaire",
    feat3: "Récompenses pondérées par la qualité & garde-fous de budget",
    feat4: "Fonctionne dans le navigateur et comme application installable",
    createCampaign: "Créer une campagne",
    corpusTitle: "Langues du corpus",
    corpusGrowing: "et plus chaque jour",
    rootsBadge: "Nos origines",
    rootsTitle: "Nous avons commencé par le texte. Vous pouvez encore l'utiliser.",
    rootsBody:
      "Lingo a débuté comme lingo.cm — un service de traduction automatique économique, à pivot français, pour les langues camerounaises. Nous avons constitué son corpus à la main à partir de toutes les sources écrites disponibles — livres, brochures, livrets numérisés et notre jeu de données ouvert cameroon_bibles — unifiées sous un même alphabet (AGLC). Ces modèles sont ouverts et en ligne. Le projet vocal est le chapitre suivant — mais la fondation est à vous, à utiliser et télécharger.",
    useTranslator: "Utiliser le traducteur",
    useTranslatorDesc: "Traduisez du texte maintenant, si un worker est en ligne.",
    modelsCard: "Modèles sur Hugging Face",
    modelsCardDesc: "Téléchargez et exécutez nos modèles Marian ouverts.",
    datasetCard: "Le jeu de données cameroon_bibles",
    datasetCardDesc: "Une partie du corpus que nous avons compilé et ouvert.",
    funding:
      "Soutenu par la Fondation Klaus Tschira via le programme Alumnode.",
    footerTagline: "Construit pour la préservation des langues",
  },
  translate: {
    title: "Traduire les langues camerounaises",
    subtitle:
      "Nos modèles d'origine à pivot français — la base textuelle d'où est né le projet vocal.",
    earnBanner: "Aidez-nous à traduire votre langue, et gagnez de l'argent !",
    placeholder: "Texte à traduire…",
    specialChars: "Caractères spéciaux (AGLC)",
    translate: "Traduire",
    translating: "Traduction…",
    online: "Serveur en ligne",
    asleep: "Serveur en veille · réessayer",
    checking: "Vérification…",
    copy: "Copier",
    copied: "Copié",
    comment: "Laisser un commentaire sur cette traduction",
    noPath: "Aucun chemin de modèle entre ces langues.",
    asleepNotice:
      "Le serveur de traduction est en veille. Les langues et la traduction s'activent automatiquement dès son retour.",
    contributePrompt: "Vous voulez de meilleurs modèles pour votre langue ?",
    contributeCta: "Contribuez votre voix →",
    cpuBanner:
      "Les réponses peuvent être lentes — nous tournons sur CPU pour garder le projet gratuit pendant son archivage. La vitesse revient automatiquement dès qu'une machine GPU se connecte.",
  },
  offlineQueue: {
    pending: "{n} en attente d'envoi",
    syncing: "Synchronisation…",
    offline: "Hors ligne — enregistré",
    retry: "Toucher pour réessayer",
  },
};

export const dictionaries = { en, fr };
export type Dict = typeof en;
