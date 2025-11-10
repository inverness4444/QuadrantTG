export type TopTabKey = "Courses" | "Library" | "Earn";

export type CourseDifficulty = "easy" | "medium" | "hard";

export type CourseCategory = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  color: string;
  accent: string;
  difficulty: CourseDifficulty;
};

export type CourseContent = {
  id: string;
  titleKey: string;
  summaryKey: string;
  categoryId: string;
  durationMinutes: number;
  difficulty: CourseDifficulty;
  imageUrl: string;
};

export type LibraryCategory = {
  id: string;
  labelKey: string;
};

export type LibraryBook = {
  id: string;
  titleKey: string;
  authorKey: string;
  synopsisKey: string;
  pages: number;
  price: number;
  categoryId: string;
  imageUrl: string;
};

export const topTabs: { key: TopTabKey; labelKey: string }[] = [
  { key: "Courses", labelKey: "home.tabs.courses" },
  { key: "Library", labelKey: "home.tabs.library" },
  { key: "Earn", labelKey: "home.tabs.earn" }
];

export const courseCategories: CourseCategory[] = [
  {
    id: "languages",
    titleKey: "courses.categories.languages.title",
    descriptionKey: "courses.categories.languages.description",
    icon: "globe",
    color: "#E8ECFF",
    accent: "#4F46E5",
    difficulty: "easy"
  },
  {
    id: "mind-thinking",
    titleKey: "courses.categories.mindThinking.title",
    descriptionKey: "courses.categories.mindThinking.description",
    icon: "aperture",
    color: "#E4F5FF",
    accent: "#2196F3",
    difficulty: "easy"
  },
  {
    id: "finance-economics",
    titleKey: "courses.categories.financeEconomics.title",
    descriptionKey: "courses.categories.financeEconomics.description",
    icon: "trending-up",
    color: "#E6F8F2",
    accent: "#26A17B",
    difficulty: "medium"
  },
  {
    id: "programming",
    titleKey: "courses.categories.programming.title",
    descriptionKey: "courses.categories.programming.description",
    icon: "code-slash",
    color: "#E6F3FF",
    accent: "#1A73E8",
    difficulty: "medium"
  },
  {
    id: "career-skills",
    titleKey: "courses.categories.careerSkills.title",
    descriptionKey: "courses.categories.careerSkills.description",
    icon: "briefcase",
    color: "#FDEFE5",
    accent: "#FF8A3D",
    difficulty: "medium"
  },
  {
    id: "future-thinking",
    titleKey: "courses.categories.futureThinking.title",
    descriptionKey: "courses.categories.futureThinking.description",
    icon: "sunrise",
    color: "#FFF7E6",
    accent: "#FFC107",
    difficulty: "hard"
  },
  {
    id: "health-body",
    titleKey: "courses.categories.healthBody.title",
    descriptionKey: "courses.categories.healthBody.description",
    icon: "heart",
    color: "#FFEAF1",
    accent: "#FF4D79",
    difficulty: "easy"
  }
];

export const COURSE_REWARD_BY_DIFFICULTY: Record<CourseDifficulty, number> = {
  easy: 10000,
  medium: 15000,
  hard: 20000
};

export const BOOK_COMPLETION_REWARD = 1000;

export const courseCatalog: CourseContent[] = [
  { id: "language-english", titleKey: "courses.items.languageEnglish.title", summaryKey: "courses.items.languageEnglish.summary", categoryId: "languages", durationMinutes: 28, difficulty: "easy", imageUrl: "" },
  { id: "language-spanish", titleKey: "courses.items.languageSpanish.title", summaryKey: "courses.items.languageSpanish.summary", categoryId: "languages", durationMinutes: 24, difficulty: "easy", imageUrl: "" },
  { id: "language-french", titleKey: "courses.items.languageFrench.title", summaryKey: "courses.items.languageFrench.summary", categoryId: "languages", durationMinutes: 26, difficulty: "easy", imageUrl: "" },
  { id: "language-chinese", titleKey: "courses.items.languageChinese.title", summaryKey: "courses.items.languageChinese.summary", categoryId: "languages", durationMinutes: 32, difficulty: "medium", imageUrl: "" },
  { id: "language-italian", titleKey: "courses.items.languageItalian.title", summaryKey: "courses.items.languageItalian.summary", categoryId: "languages", durationMinutes: 24, difficulty: "easy", imageUrl: "" },
  { id: "language-german", titleKey: "courses.items.languageGerman.title", summaryKey: "courses.items.languageGerman.summary", categoryId: "languages", durationMinutes: 30, difficulty: "medium", imageUrl: "" },
  { id: "language-portuguese", titleKey: "courses.items.languagePortuguese.title", summaryKey: "courses.items.languagePortuguese.summary", categoryId: "languages", durationMinutes: 26, difficulty: "easy", imageUrl: "" },
  { id: "language-russian", titleKey: "courses.items.languageRussian.title", summaryKey: "courses.items.languageRussian.summary", categoryId: "languages", durationMinutes: 28, difficulty: "medium", imageUrl: "" },
  { id: "mind-speed-memory", titleKey: "courses.items.mindSpeedMemory.title", summaryKey: "courses.items.mindSpeedMemory.summary", categoryId: "mind-thinking", durationMinutes: 30, difficulty: "medium", imageUrl: "" },
  { id: "mind-critical-thinking", titleKey: "courses.items.mindCriticalThinking.title", summaryKey: "courses.items.mindCriticalThinking.summary", categoryId: "mind-thinking", durationMinutes: 32, difficulty: "medium", imageUrl: "" },
  { id: "mind-psychology", titleKey: "courses.items.mindPsychology.title", summaryKey: "courses.items.mindPsychology.summary", categoryId: "mind-thinking", durationMinutes: 34, difficulty: "medium", imageUrl: "" },
  { id: "mind-neuroscience", titleKey: "courses.items.mindNeuroscience.title", summaryKey: "courses.items.mindNeuroscience.summary", categoryId: "mind-thinking", durationMinutes: 34, difficulty: "medium", imageUrl: "" },
  { id: "mind-emotional-intelligence", titleKey: "courses.items.mindEmotionalIntelligence.title", summaryKey: "courses.items.mindEmotionalIntelligence.summary", categoryId: "mind-thinking", durationMinutes: 30, difficulty: "medium", imageUrl: "" },
  { id: "mind-mindfulness", titleKey: "courses.items.mindMindfulness.title", summaryKey: "courses.items.mindMindfulness.summary", categoryId: "mind-thinking", durationMinutes: 24, difficulty: "easy", imageUrl: "" },
  { id: "mind-decision-making", titleKey: "courses.items.mindDecisionMaking.title", summaryKey: "courses.items.mindDecisionMaking.summary", categoryId: "mind-thinking", durationMinutes: 32, difficulty: "medium", imageUrl: "" },
  { id: "finance-crypto", titleKey: "courses.items.financeCrypto.title", summaryKey: "courses.items.financeCrypto.summary", categoryId: "finance-economics", durationMinutes: 34, difficulty: "medium", imageUrl: "" },
  { id: "finance-business", titleKey: "courses.items.financeBusiness.title", summaryKey: "courses.items.financeBusiness.summary", categoryId: "finance-economics", durationMinutes: 32, difficulty: "medium", imageUrl: "" },
  { id: "finance-literacy", titleKey: "courses.items.financeLiteracy.title", summaryKey: "courses.items.financeLiteracy.summary", categoryId: "finance-economics", durationMinutes: 32, difficulty: "medium", imageUrl: "" },
  { id: "finance-economics-course", titleKey: "courses.items.financeEconomicsCourse.title", summaryKey: "courses.items.financeEconomicsCourse.summary", categoryId: "finance-economics", durationMinutes: 32, difficulty: "medium", imageUrl: "" },
  { id: "finance-entrepreneurship", titleKey: "courses.items.financeEntrepreneurship.title", summaryKey: "courses.items.financeEntrepreneurship.summary", categoryId: "finance-economics", durationMinutes: 36, difficulty: "medium", imageUrl: "" },
  { id: "finance-accounting", titleKey: "courses.items.financeAccounting.title", summaryKey: "courses.items.financeAccounting.summary", categoryId: "finance-economics", durationMinutes: 34, difficulty: "medium", imageUrl: "" },
  { id: "programming-ai", titleKey: "courses.items.programmingAI.title", summaryKey: "courses.items.programmingAI.summary", categoryId: "programming", durationMinutes: 36, difficulty: "hard", imageUrl: "" },
  { id: "programming-python", titleKey: "courses.items.programmingPython.title", summaryKey: "courses.items.programmingPython.summary", categoryId: "programming", durationMinutes: 32, difficulty: "medium", imageUrl: "" },
  { id: "programming-data-science", titleKey: "courses.items.programmingDataScience.title", summaryKey: "courses.items.programmingDataScience.summary", categoryId: "programming", durationMinutes: 34, difficulty: "hard", imageUrl: "" },
  { id: "career-teaching", titleKey: "courses.items.careerTeaching.title", summaryKey: "courses.items.careerTeaching.summary", categoryId: "career-skills", durationMinutes: 30, difficulty: "medium", imageUrl: "" },
  { id: "career-uiux", titleKey: "courses.items.careerUIUX.title", summaryKey: "courses.items.careerUIUX.summary", categoryId: "career-skills", durationMinutes: 32, difficulty: "medium", imageUrl: "" },
  { id: "career-public-speaking", titleKey: "courses.items.careerPublicSpeaking.title", summaryKey: "courses.items.careerPublicSpeaking.summary", categoryId: "career-skills", durationMinutes: 28, difficulty: "medium", imageUrl: "" },
  { id: "career-digital-marketing", titleKey: "courses.items.careerDigitalMarketing.title", summaryKey: "courses.items.careerDigitalMarketing.summary", categoryId: "career-skills", durationMinutes: 32, difficulty: "medium", imageUrl: "" },
  { id: "career-productivity", titleKey: "courses.items.careerProductivity.title", summaryKey: "courses.items.careerProductivity.summary", categoryId: "career-skills", durationMinutes: 26, difficulty: "easy", imageUrl: "" },
  { id: "career-statistics", titleKey: "courses.items.careerStatistics.title", summaryKey: "courses.items.careerStatistics.summary", categoryId: "career-skills", durationMinutes: 34, difficulty: "medium", imageUrl: "" },
  { id: "health-nutrition", titleKey: "courses.items.healthNutrition.title", summaryKey: "courses.items.healthNutrition.summary", categoryId: "health-body", durationMinutes: 28, difficulty: "easy", imageUrl: "" },
  { id: "health-functional-training", titleKey: "courses.items.healthFunctionalTraining.title", summaryKey: "courses.items.healthFunctionalTraining.summary", categoryId: "health-body", durationMinutes: 30, difficulty: "medium", imageUrl: "" },
  { id: "health-biohacking", titleKey: "courses.items.healthBiohacking.title", summaryKey: "courses.items.healthBiohacking.summary", categoryId: "health-body", durationMinutes: 32, difficulty: "medium", imageUrl: "" },
  { id: "health-sleep", titleKey: "courses.items.healthSleep.title", summaryKey: "courses.items.healthSleep.summary", categoryId: "health-body", durationMinutes: 26, difficulty: "easy", imageUrl: "" }
];

export const libraryCategories: LibraryCategory[] = [
  { id: "all", labelKey: "library.categories.all" },
  { id: "my-library", labelKey: "library.categories.myLibrary" },
  { id: "psychology-thinking-development", labelKey: "library.categories.psychology" },
  { id: "finance-economics", labelKey: "library.categories.finance" },
  { id: "technology-future", labelKey: "library.categories.technologyFuture" },
  { id: "entrepreneurship-career", labelKey: "library.categories.entrepreneurshipCareer" },
  { id: "communication-soft-skills", labelKey: "library.categories.communicationSoftSkills" },
  { id: "health-fitness-nutrition", labelKey: "library.categories.healthFitness" },
  { id: "marketing", labelKey: "library.categories.marketing" },
  { id: "classics", labelKey: "library.categories.classics" },
  { id: "religion", labelKey: "library.categories.religion" },
  { id: "popular-personalities", labelKey: "library.categories.popularPersonalities" },
  { id: "relationships", labelKey: "library.categories.relationships" }
];

export const libraryBooks: LibraryBook[] = [
  {
    id: "quran",
    titleKey: "library.books.quran.title",
    authorKey: "library.books.quran.author",
    synopsisKey: "library.books.quran.synopsis",
    pages: 604,
    price: 0,
    categoryId: "religion",
    imageUrl: "https://covers.openlibrary.org/b/id/717634-L.jpg"
  },
  {
    id: "bible",
    titleKey: "library.books.bible.title",
    authorKey: "library.books.bible.author",
    synopsisKey: "library.books.bible.synopsis",
    pages: 1200,
    price: 0,
    categoryId: "religion",
    imageUrl: "https://covers.openlibrary.org/b/id/8238736-L.jpg"
  },
  {
    id: "mamba-mentality",
    titleKey: "library.books.mambaMentality.title",
    authorKey: "library.books.mambaMentality.author",
    synopsisKey: "library.books.mambaMentality.synopsis",
    pages: 208,
    price: 0,
    categoryId: "popular-personalities",
    imageUrl: "https://covers.openlibrary.org/b/id/10109114-L.jpg"
  },
  {
    id: "ronaldo-moments",
    titleKey: "library.books.ronaldoMoments.title",
    authorKey: "library.books.ronaldoMoments.author",
    synopsisKey: "library.books.ronaldoMoments.synopsis",
    pages: 256,
    price: 0,
    categoryId: "popular-personalities",
    imageUrl: "https://covers.openlibrary.org/b/isbn/9781473537644-L.jpg"
  },
  {
    id: "zlatan",
    titleKey: "library.books.zlatan.title",
    authorKey: "library.books.zlatan.author",
    synopsisKey: "library.books.zlatan.synopsis",
    pages: 416,
    price: 0,
    categoryId: "popular-personalities",
    imageUrl: "https://covers.openlibrary.org/b/id/8056645-L.jpg"
  },
  {
    id: "jordan-accept",
    titleKey: "library.books.jordanAccept.title",
    authorKey: "library.books.jordanAccept.author",
    synopsisKey: "library.books.jordanAccept.synopsis",
    pages: 96,
    price: 0,
    categoryId: "popular-personalities",
    imageUrl: "https://covers.openlibrary.org/b/id/48582-L.jpg"
  },
  {
    id: "ali-soul",
    titleKey: "library.books.aliSoul.title",
    authorKey: "library.books.aliSoul.author",
    synopsisKey: "library.books.aliSoul.synopsis",
    pages: 320,
    price: 0,
    categoryId: "popular-personalities",
    imageUrl: "https://covers.openlibrary.org/b/id/1290091-L.jpg"
  },
  {
    id: "five-love-languages",
    titleKey: "library.books.fiveLoveLanguages.title",
    authorKey: "library.books.fiveLoveLanguages.author",
    synopsisKey: "library.books.fiveLoveLanguages.synopsis",
    pages: 208,
    price: 0,
    categoryId: "relationships",
    imageUrl: "https://covers.openlibrary.org/b/id/12602983-L.jpg"
  },
  {
    id: "men-from-mars",
    titleKey: "library.books.menFromMars.title",
    authorKey: "library.books.menFromMars.author",
    synopsisKey: "library.books.menFromMars.synopsis",
    pages: 320,
    price: 0,
    categoryId: "relationships",
    imageUrl: "https://covers.openlibrary.org/b/id/10991-L.jpg"
  },
  {
    id: "mating-in-captivity",
    titleKey: "library.books.matingInCaptivity.title",
    authorKey: "library.books.matingInCaptivity.author",
    synopsisKey: "library.books.matingInCaptivity.synopsis",
    pages: 272,
    price: 0,
    categoryId: "relationships",
    imageUrl: "https://covers.openlibrary.org/b/id/46486-L.jpg"
  },
  {
    id: "why-we-love",
    titleKey: "library.books.whyWeLove.title",
    authorKey: "library.books.whyWeLove.author",
    synopsisKey: "library.books.whyWeLove.synopsis",
    pages: 306,
    price: 0,
    categoryId: "relationships",
    imageUrl: "https://covers.openlibrary.org/b/id/580848-L.jpg"
  },
  {
    id: "games-people-play",
    titleKey: "library.books.gamesPeoplePlay.title",
    authorKey: "library.books.gamesPeoplePlay.author",
    synopsisKey: "library.books.gamesPeoplePlay.synopsis",
    pages: 216,
    price: 0,
    categoryId: "relationships",
    imageUrl: "https://covers.openlibrary.org/b/id/8281189-L.jpg"
  },
  {
    id: "war-and-peace",
    titleKey: "library.books.warAndPeace.title",
    authorKey: "library.books.warAndPeace.author",
    synopsisKey: "library.books.warAndPeace.synopsis",
    pages: 1225,
    price: 0,
    categoryId: "classics",
    imageUrl: "https://covers.openlibrary.org/b/id/12621906-L.jpg"
  },
  {
    id: "crime-and-punishment",
    titleKey: "library.books.crimeAndPunishment.title",
    authorKey: "library.books.crimeAndPunishment.author",
    synopsisKey: "library.books.crimeAndPunishment.synopsis",
    pages: 671,
    price: 0,
    categoryId: "classics",
    imageUrl: "https://covers.openlibrary.org/b/id/14911181-L.jpg"
  },
  {
    id: "eugene-onegin",
    titleKey: "library.books.eugeneOnegin.title",
    authorKey: "library.books.eugeneOnegin.author",
    synopsisKey: "library.books.eugeneOnegin.synopsis",
    pages: 384,
    price: 0,
    categoryId: "classics",
    imageUrl: "https://covers.openlibrary.org/b/id/11365660-L.jpg"
  },
  {
    id: "dead-souls",
    titleKey: "library.books.deadSouls.title",
    authorKey: "library.books.deadSouls.author",
    synopsisKey: "library.books.deadSouls.synopsis",
    pages: 352,
    price: 0,
    categoryId: "classics",
    imageUrl: "https://covers.openlibrary.org/b/id/7496125-L.jpg"
  },
  {
    id: "hamlet",
    titleKey: "library.books.hamlet.title",
    authorKey: "library.books.hamlet.author",
    synopsisKey: "library.books.hamlet.synopsis",
    pages: 210,
    price: 0,
    categoryId: "classics",
    imageUrl: "https://covers.openlibrary.org/b/id/8281954-L.jpg"
  },
  {
    id: "tom-sawyer",
    titleKey: "library.books.tomSawyer.title",
    authorKey: "library.books.tomSawyer.author",
    synopsisKey: "library.books.tomSawyer.synopsis",
    pages: 274,
    price: 0,
    categoryId: "classics",
    imageUrl: "https://covers.openlibrary.org/b/id/12043351-L.jpg"
  },
  {
    id: "anna-karenina",
    titleKey: "library.books.annaKarenina.title",
    authorKey: "library.books.annaKarenina.author",
    synopsisKey: "library.books.annaKarenina.synopsis",
    pages: 864,
    price: 0,
    categoryId: "classics",
    imageUrl: "https://covers.openlibrary.org/b/id/12327215-L.jpg"
  },
  {
    id: "fathers-and-sons",
    titleKey: "library.books.fathersAndSons.title",
    authorKey: "library.books.fathersAndSons.author",
    synopsisKey: "library.books.fathersAndSons.synopsis",
    pages: 244,
    price: 0,
    categoryId: "classics",
    imageUrl: "https://covers.openlibrary.org/b/id/11149397-L.jpg"
  },
  {
    id: "count-of-monte-cristo",
    titleKey: "library.books.countOfMonteCristo.title",
    authorKey: "library.books.countOfMonteCristo.author",
    synopsisKey: "library.books.countOfMonteCristo.synopsis",
    pages: 1276,
    price: 0,
    categoryId: "classics",
    imageUrl: "https://covers.openlibrary.org/b/id/8851690-L.jpg"
  },
  {
    id: "robinson-crusoe",
    titleKey: "library.books.robinsonCrusoe.title",
    authorKey: "library.books.robinsonCrusoe.author",
    synopsisKey: "library.books.robinsonCrusoe.synopsis",
    pages: 320,
    price: 0,
    categoryId: "classics",
    imageUrl: "https://covers.openlibrary.org/b/id/8783768-L.jpg"
  },
  {
    id: "gullivers-travels",
    titleKey: "library.books.gulliversTravels.title",
    authorKey: "library.books.gulliversTravels.author",
    synopsisKey: "library.books.gulliversTravels.synopsis",
    pages: 352,
    price: 0,
    categoryId: "classics",
    imageUrl: "https://covers.openlibrary.org/b/id/12717083-L.jpg"
  },
  {
    id: "homo-deus",
    titleKey: "library.books.homoDeus.title",
    authorKey: "library.books.homoDeus.author",
    synopsisKey: "library.books.homoDeus.synopsis",
    pages: 464,
    price: 0,
    categoryId: "technology-future",
    imageUrl: "https://covers.openlibrary.org/b/id/14421556-L.jpg"
  },
  {
    id: "life-3-0",
    titleKey: "library.books.life3.title",
    authorKey: "library.books.life3.author",
    synopsisKey: "library.books.life3.synopsis",
    pages: 384,
    price: 0,
    categoryId: "technology-future",
    imageUrl: "https://covers.openlibrary.org/b/id/10239283-L.jpg"
  },
  {
    id: "blockchain-revolution",
    titleKey: "library.books.blockchainRevolution.title",
    authorKey: "library.books.blockchainRevolution.author",
    synopsisKey: "library.books.blockchainRevolution.synopsis",
    pages: 368,
    price: 0,
    categoryId: "technology-future",
    imageUrl: "https://covers.openlibrary.org/b/id/12634460-L.jpg"
  },
  {
    id: "superintelligence",
    titleKey: "library.books.superintelligence.title",
    authorKey: "library.books.superintelligence.author",
    synopsisKey: "library.books.superintelligence.synopsis",
    pages: 352,
    price: 0,
    categoryId: "technology-future",
    imageUrl: "https://covers.openlibrary.org/b/id/8039542-L.jpg"
  },
  {
    id: "lean-startup",
    titleKey: "library.books.leanStartup.title",
    authorKey: "library.books.leanStartup.author",
    synopsisKey: "library.books.leanStartup.synopsis",
    pages: 336,
    price: 0,
    categoryId: "entrepreneurship-career",
    imageUrl: "https://covers.openlibrary.org/b/id/7104760-L.jpg"
  },
  {
    id: "start-with-why",
    titleKey: "library.books.startWithWhy.title",
    authorKey: "library.books.startWithWhy.author",
    synopsisKey: "library.books.startWithWhy.synopsis",
    pages: 256,
    price: 0,
    categoryId: "entrepreneurship-career",
    imageUrl: "https://covers.openlibrary.org/b/id/6395237-L.jpg"
  },
  {
    id: "zero-to-one",
    titleKey: "library.books.zeroToOne.title",
    authorKey: "library.books.zeroToOne.author",
    synopsisKey: "library.books.zeroToOne.synopsis",
    pages: 224,
    price: 0,
    categoryId: "entrepreneurship-career",
    imageUrl: "https://covers.openlibrary.org/b/id/9002334-L.jpg"
  },
  {
    id: "good-to-great",
    titleKey: "library.books.goodToGreat.title",
    authorKey: "library.books.goodToGreat.author",
    synopsisKey: "library.books.goodToGreat.synopsis",
    pages: 320,
    price: 0,
    categoryId: "entrepreneurship-career",
    imageUrl: "https://covers.openlibrary.org/b/id/53111-L.jpg"
  },
  {
    id: "startup-owners-manual",
    titleKey: "library.books.startupOwnersManual.title",
    authorKey: "library.books.startupOwnersManual.author",
    synopsisKey: "library.books.startupOwnersManual.synopsis",
    pages: 608,
    price: 0,
    categoryId: "entrepreneurship-career",
    imageUrl: "https://covers.openlibrary.org/b/id/8742256-L.jpg"
  },
  {
    id: "never-split-the-difference",
    titleKey: "library.books.neverSplitDifference.title",
    authorKey: "library.books.neverSplitDifference.author",
    synopsisKey: "library.books.neverSplitDifference.synopsis",
    pages: 288,
    price: 0,
    categoryId: "communication-soft-skills",
    imageUrl: "https://covers.openlibrary.org/b/id/8365942-L.jpg"
  },
  {
    id: "influence",
    titleKey: "library.books.influence.title",
    authorKey: "library.books.influence.author",
    synopsisKey: "library.books.influence.synopsis",
    pages: 336,
    price: 0,
    categoryId: "communication-soft-skills",
    imageUrl: "https://covers.openlibrary.org/b/id/13231578-L.jpg"
  },
  {
    id: "talk-like-ted",
    titleKey: "library.books.talkLikeTed.title",
    authorKey: "library.books.talkLikeTed.author",
    synopsisKey: "library.books.talkLikeTed.synopsis",
    pages: 288,
    price: 0,
    categoryId: "communication-soft-skills",
    imageUrl: "https://covers.openlibrary.org/b/id/7316010-L.jpg"
  },
  {
    id: "radical-candor",
    titleKey: "library.books.radicalCandor.title",
    authorKey: "library.books.radicalCandor.author",
    synopsisKey: "library.books.radicalCandor.synopsis",
    pages: 320,
    price: 0,
    categoryId: "communication-soft-skills",
    imageUrl: "https://covers.openlibrary.org/b/id/8088432-L.jpg"
  },
  {
    id: "quiet",
    titleKey: "library.books.quiet.title",
    authorKey: "library.books.quiet.author",
    synopsisKey: "library.books.quiet.synopsis",
    pages: 368,
    price: 0,
    categoryId: "communication-soft-skills",
    imageUrl: "https://covers.openlibrary.org/b/id/13331166-L.jpg"
  },
  {
    id: "why-we-sleep",
    titleKey: "library.books.whyWeSleep.title",
    authorKey: "library.books.whyWeSleep.author",
    synopsisKey: "library.books.whyWeSleep.synopsis",
    pages: 368,
    price: 0,
    categoryId: "health-fitness-nutrition",
    imageUrl: "https://covers.openlibrary.org/b/id/8814155-L.jpg"
  },
  {
    id: "eat-to-live",
    titleKey: "library.books.eatToLive.title",
    authorKey: "library.books.eatToLive.author",
    synopsisKey: "library.books.eatToLive.synopsis",
    pages: 400,
    price: 0,
    categoryId: "health-fitness-nutrition",
    imageUrl: "https://covers.openlibrary.org/b/id/6513948-L.jpg"
  },
  {
    id: "bigger-leaner-stronger",
    titleKey: "library.books.biggerLeanerStronger.title",
    authorKey: "library.books.biggerLeanerStronger.author",
    synopsisKey: "library.books.biggerLeanerStronger.synopsis",
    pages: 480,
    price: 0,
    categoryId: "health-fitness-nutrition",
    imageUrl: "https://covers.openlibrary.org/b/id/10656236-L.jpg"
  },
  {
    id: "fitness-mindset",
    titleKey: "library.books.fitnessMindset.title",
    authorKey: "library.books.fitnessMindset.author",
    synopsisKey: "library.books.fitnessMindset.synopsis",
    pages: 206,
    price: 0,
    categoryId: "health-fitness-nutrition",
    imageUrl: "https://covers.openlibrary.org/b/id/10836878-L.jpg"
  },
  {
    id: "body-book",
    titleKey: "library.books.bodyBook.title",
    authorKey: "library.books.bodyBook.author",
    synopsisKey: "library.books.bodyBook.synopsis",
    pages: 272,
    price: 0,
    categoryId: "health-fitness-nutrition",
    imageUrl: "https://covers.openlibrary.org/b/id/10526598-L.jpg"
  },
  {
    id: "purple-cow",
    titleKey: "library.books.purpleCow.title",
    authorKey: "library.books.purpleCow.author",
    synopsisKey: "library.books.purpleCow.synopsis",
    pages: 224,
    price: 0,
    categoryId: "marketing",
    imageUrl: "https://covers.openlibrary.org/b/id/866008-L.jpg"
  },
  {
    id: "marketing-a-to-z",
    titleKey: "library.books.marketingAToZ.title",
    authorKey: "library.books.marketingAToZ.author",
    synopsisKey: "library.books.marketingAToZ.synopsis",
    pages: 256,
    price: 0,
    categoryId: "marketing",
    imageUrl: "https://covers.openlibrary.org/b/id/1915039-L.jpg"
  },
  {
    id: "positioning",
    titleKey: "library.books.positioning.title",
    authorKey: "library.books.positioning.author",
    synopsisKey: "library.books.positioning.synopsis",
    pages: 213,
    price: 0,
    categoryId: "marketing",
    imageUrl: "https://covers.openlibrary.org/b/isbn/0071373586-L.jpg"
  },
  {
    id: "immutable-laws",
    titleKey: "library.books.immutableLaws.title",
    authorKey: "library.books.immutableLaws.author",
    synopsisKey: "library.books.immutableLaws.synopsis",
    pages: 143,
    price: 0,
    categoryId: "marketing",
    imageUrl: "https://covers.openlibrary.org/b/id/4009958-L.jpg"
  },
  {
    id: "made-to-stick",
    titleKey: "library.books.madeToStick.title",
    authorKey: "library.books.madeToStick.author",
    synopsisKey: "library.books.madeToStick.synopsis",
    pages: 336,
    price: 0,
    categoryId: "marketing",
    imageUrl: "https://covers.openlibrary.org/b/id/7004880-L.jpg"
  },
  {
    id: "rich-dad-poor-dad",
    titleKey: "library.books.richDad.title",
    authorKey: "library.books.richDad.author",
    synopsisKey: "library.books.richDad.synopsis",
    pages: 336,
    price: 0,
    categoryId: "finance-economics",
    imageUrl: "https://covers.openlibrary.org/b/id/8315603-L.jpg"
  },
  {
    id: "intelligent-investor",
    titleKey: "library.books.intelligentInvestor.title",
    authorKey: "library.books.intelligentInvestor.author",
    synopsisKey: "library.books.intelligentInvestor.synopsis",
    pages: 640,
    price: 0,
    categoryId: "finance-economics",
    imageUrl: "https://covers.openlibrary.org/b/id/36434-L.jpg"
  },
  {
    id: "road-to-financial-freedom",
    titleKey: "library.books.roadToFinancialFreedom.title",
    authorKey: "library.books.roadToFinancialFreedom.author",
    synopsisKey: "library.books.roadToFinancialFreedom.synopsis",
    pages: 352,
    price: 0,
    categoryId: "finance-economics",
    imageUrl: "https://covers.openlibrary.org/b/id/1454872-L.jpg"
  },
  {
    id: "think-and-grow-rich",
    titleKey: "library.books.thinkAndGrowRich.title",
    authorKey: "library.books.thinkAndGrowRich.author",
    synopsisKey: "library.books.thinkAndGrowRich.synopsis",
    pages: 320,
    price: 0,
    categoryId: "finance-economics",
    imageUrl: "https://covers.openlibrary.org/b/id/14542536-L.jpg"
  },
  {
    id: "richest-man-in-babylon",
    titleKey: "library.books.richestManBabylon.title",
    authorKey: "library.books.richestManBabylon.author",
    synopsisKey: "library.books.richestManBabylon.synopsis",
    pages: 194,
    price: 0,
    categoryId: "finance-economics",
    imageUrl: "https://covers.openlibrary.org/b/id/10491331-L.jpg"
  },
  {
    id: "atomic-habits",
    titleKey: "library.books.atomicHabits.title",
    authorKey: "library.books.atomicHabits.author",
    synopsisKey: "library.books.atomicHabits.synopsis",
    pages: 320,
    price: 0,
    categoryId: "psychology-thinking-development",
    imageUrl: "https://covers.openlibrary.org/b/id/12539702-L.jpg"
  },
  {
    id: "thinking-fast-slow",
    titleKey: "library.books.thinkingFastSlow.title",
    authorKey: "library.books.thinkingFastSlow.author",
    synopsisKey: "library.books.thinkingFastSlow.synopsis",
    pages: 512,
    price: 0,
    categoryId: "psychology-thinking-development",
    imageUrl: "https://covers.openlibrary.org/b/id/13290711-L.jpg"
  },
  {
    id: "seven-habits",
    titleKey: "library.books.sevenHabits.title",
    authorKey: "library.books.sevenHabits.author",
    synopsisKey: "library.books.sevenHabits.synopsis",
    pages: 432,
    price: 0,
    categoryId: "psychology-thinking-development",
    imageUrl: "https://covers.openlibrary.org/b/id/10079937-L.jpg"
  },
  {
    id: "power-of-habit",
    titleKey: "library.books.powerOfHabit.title",
    authorKey: "library.books.powerOfHabit.author",
    synopsisKey: "library.books.powerOfHabit.synopsis",
    pages: 371,
    price: 0,
    categoryId: "psychology-thinking-development",
    imageUrl: "https://covers.openlibrary.org/b/id/9078085-L.jpg"
  },
  {
    id: "how-to-win-friends",
    titleKey: "library.books.howToWinFriends.title",
    authorKey: "library.books.howToWinFriends.author",
    synopsisKey: "library.books.howToWinFriends.synopsis",
    pages: 320,
    price: 0,
    categoryId: "psychology-thinking-development",
    imageUrl: "https://covers.openlibrary.org/b/id/13314878-L.jpg"
  }
];

export type EarnTask = {
  id: string;
  titleKey: string;
  rewardKey: string;
  limitsKey: string;
  verificationKey: string;
  icon: string;
};

export const earnTasks: EarnTask[] = [
  {
    id: "telegram-subscribe",
    titleKey: "earn.tasks.telegram.title",
    rewardKey: "earn.tasks.telegram.reward",
    limitsKey: "earn.tasks.telegram.limits",
    verificationKey: "earn.tasks.telegram.verification",
    icon: "send"
  },
  {
    id: "discord-join",
    titleKey: "earn.tasks.discord.title",
    rewardKey: "earn.tasks.discord.reward",
    limitsKey: "earn.tasks.discord.limits",
    verificationKey: "earn.tasks.discord.verification",
    icon: "message-circle"
  },
  {
    id: "invite-friend",
    titleKey: "earn.tasks.invite.title",
    rewardKey: "earn.tasks.invite.reward",
    limitsKey: "earn.tasks.invite.limits",
    verificationKey: "earn.tasks.invite.verification",
    icon: "user-plus"
  }
];

export const earnGeneralRules = [
  { id: "courses", textKey: "earn.rules.courses" },
  { id: "books", textKey: "earn.rules.books" },
  { id: "steps", textKey: "earn.rules.steps" },
  { id: "workouts", textKey: "earn.rules.workouts" },
  { id: "single-activity", textKey: "earn.rules.singleActivity" },
  { id: "token-spend", textKey: "earn.rules.tokenSpend" },
  { id: "no-burn", textKey: "earn.rules.noBurn" }
];
