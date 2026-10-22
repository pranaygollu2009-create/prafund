/**
 * Base content for the reviews wall: ~200 pre-written, deterministic reviews
 * that ship with the site so the page is never empty. Look-and-feel matches
 * real community posts (first name + initial, a body, a rating and a date)
 * but they are simulated demo reviews, and the UI labels them as such.
 *
 * Generation is seeded, so the list is identical on every load/deploy —
 * counts, averages and ★ breakdowns stay stable.
 */

export type Review = {
  id: string;
  name: string;
  rating: number;
  body: string;
  at: string; // ISO timestamp
  kind: "seed" | "wall" | "local";
  /** Present only for wall reviews owned by the signed-in user. */
  userId?: string | null;
};

const FIRST_NAMES = [
  "Maya", "Devon", "Priya", "Sofia", "Liam", "Aisha", "Jordan", "Emma", "Rohan", "Chloe",
  "Marcus", "Ana", "Tariq", "Imani", "Noah", "Grace", "Leo", "Zainab", "Ethan", "Lucy",
  "Diego", "Hannah", "Kofi", "Isla", "Arjun", "Theo", "Naomi", "Carlos", "Ruby", "Felix",
  "Sana", "Omar", "Leila", "Victor", "Aiyana", "Ivan", "Zara", "Hugo", "Priyanka", "Matt",
  "Nia", "Samir", "Elena", "Kai", "Fatima", "Jonas", "Amara", "Ravi", "Stella", "Bilal",
  "Izzy", "Mateo", "Keira", "Dmitri", "Yara", "Finn", "Layla", "Owen", "Simone", "Dean",
  "Talia", "Aiden", "Pooja", "Wes", "Camille", "Hassan", "Bella", "Yusuf", "Erin",
  "Nikhil", "Sloane", "Hamza", "Vera", "Andre", "Sara", "Tobias", "Amir", "Jade", "Malik",
  "Esi", "Caleb", "Rosie", "Ibrahim", "Nina", "Quinn", "Dani", "Trevor", "Alia", "Gus",
  "Meera", "Oskar", "Wren", "Paulo", "Kimani", "Aggie", "Rex", "Una", "Selam", "Jules",
  "Tori", "Anya", "Sol", "Marisol", "Ever", "Deepa", "Carmelo", "Fiona", "Idris", "Vicente",
  "Lois", "Brendan", "Ilana", "Cyrus", "Poppy", "Kade", "Lorena", "Elif", "Bo", "Iris",
  "Nabil", "Ivy", "Salma", "Callum", "Esther",
];

const POSITIVE = [
  "The monthly simulation finally made compound growth click for me.",
  "I signed up during study hall — three weeks later I manage a whole simulated budget without thinking about it.",
  "The Life Path quiz scared me a little about rent prices, in a good way.",
  "Watching my fake $359 car repair wipe out my fake savings taught me more than any lecture.",
  "The What-If tab is my favorite — I love sliding rent and transport costs around.",
  "Investing page makes diversification feel obvious instead of abstract.",
  "I finally understand why everyone says 'start saving early'. Seeing 6% play out over months sells it.",
  "The knowledge challenges are addictive — I savor redeeming them for cash boosts.",
  "Honestly the cleanest finance simulator I've tried, and I've tried several.",
  "It rewards patience. My simulated emergency fund finally covers three months.",
  "The XP system sneaked me into learning taxes. Well played, Prafund.",
  "Markets tab is fun — watching prices move makes holding feel real.",
  "I used to wave at spreadsheets. Now I understand my own parents' budgeting choices.",
  "The little events (certifications, moving, vacations) feel like real life choices, not quiz questions.",
  "After a month of sim months I started a real one — welcome to adulthood, me.",
  "My money knowledge used to be a vibes-only situation. Now there are numbers.",
  "Everything is visual. I'm a visual person and I've never seen money explained like this.",
  "The dashboard's financial health score is fair but motivating — mine went from 42 to 71.",
  "It handles failure well. Greeting my first debt bounce-back made me rethink credit card minimums.",
  "Got my 6th lesson badge and an actual understanding of APR. Ten out of ten.",
  "I showed the simulator to my mom. She got competitive with her own real budget.",
  "Index funds were a mystery to me until this. Now I can explain one to my friends.",
  "The glossary saved me on an econ homework. No notes needed.",
  "Playing through an entire simulated year made long-term plans feel tangible.",
  "I like that it pushes back — choosing luxury stuff tanks your simulation just like real life.",
  "Sixty seconds of reading, one question, real XP. Perfect for Commute Learn.",
  "The portfolio page is simple. No overload. Just what you own and what it's doing.",
  "Compare mode showed me exactly how much a used car over a new one saves. Converted.",
  "As someone terrified of investing, this built my confidence gradually.",
  "The day-to-day feel of the simulator kept me coming back even without rewards.",
  "Went from skipping lunch money debates to tracking my real expenses. Unintended side effect.",
  "It's the first time I've seen my own paychecks structured into needs, wants and savings.",
  "Somewhere around simulated month 8, budgeting just stops being stressful.",
  "Playful but real. It never feels like homework even with the lessons attached.",
  "The stock sim prices actually move. I've checked during actual market hours and it tracks.",
  "Nice that it throws you into decisions without a right-answer safety net.",
  "The emergency-fund challenge question alone is worth the account.",
  "Finally a finance app that makes me think before I tap instead of after.",
  "There's real strategy here. Debt pay-off order, savings amount, investing — the sim rewards thinking ahead.",
  "Sim months kept nudging me to buy a certification. When my income rose in month 4, that lesson stuck.",
  "I recommend it to my friends at the same time I tell them to read one book: both work.",
  "The tools are lightweight but the outcome feels heavy — in a good way.",
  "My economics teacher uses it too, which lowered my eyes after the gross-vs-take-home lesson.",
  "Simulating a lower salary with cheaper rent was more useful than my entire personal-finance unit.",
  "The what-if slider answering 'can I afford this?' is satisfying every single time.",
  "Never thought I'd voluntarily replay a tax lesson. Here we are.",
];

const MIXED = [
  "Really useful overall. I wish the markets moved faster during the day though.",
  "Great concept. Some lesson texts are a touch short for what they cover.",
  "The simulator nailed budgeting, but I got a bit lost on the investing page at first.",
  "Five stars for clarity, three for content depth. It's a good starting point, not a full course.",
  "Loved the event system but my simulated credit card surprised me with how fast interest compounds.",
  "The scoring feels harsh in early sim months. My 2-month emergency-fund score made me rebuild twice.",
  "Wish I could customize my career salary. The preset jobs are solid though.",
  "Good tool for basics. If you want deep tax rules, you'll outgrow it in a week.",
  "Sign-up flow was smooth, but exploring the glossary before the quiz would help a lot.",
  "Vibe is on point, but I'd love real-world news anchors every now and then in the market tab.",
  "Solid hours spent here. Fair point: the Life Path choices are pretty America-specific.",
  "The sim is forgiving when you mess up. Sometimes I want the stove to be hotter.",
  "The visual design sells it. Some tooltips cover the text on a small phone.",
  "I would use this daily if it had weekly rather than monthly checkpoints.",
  "The learn quizzes are quick wins, but I'd prefer harder options once you get three right in a row.",
  "Great first week. My complaint: the leaderboard flaming stops after the first five days.",
  "I understand APR now, which is more than my last real banking app did for me.",
  "Good enough that I stopped keeping notes elsewhere, complementary to my econ class.",
  "It works like a charm on laptop; mobile layout still slightly tight in the portfolio page.",
  "The monthly events are unpredictable in a good way, though I'd like a 'choose difficulty' toggle.",
];

const CRITICAL = [
  "Didn't hold my attention past the first few sim months — made me wish for faster pacing.",
  "Feels a bit game-y. My enthusiasm faded by week three.",
  "Good bones, needs tuning. Some scores feel arbitrary before month three.",
  "Not for me. I wanted deeper content and got a nice lightweight overview instead.",
  "The mobile spacing nav drawer never hides fully after I open the menu once.",
  "Confusing first session. The dashboard needs a 'start here' pointer.",
  "Prices move but market info feels sparse after a few minutes.",
  "The XP curve left me with a plateau feeling by lesson six.",
  "I got lost on Life Path choices and just closed the tab mid-way once.",
  "Interesting idea yet underpowered once you hit seven sim months. I did learn things.",
];

const SUFFIXES = [
  "",
  " Highly recommend trying a full simulated year.",
  " It only takes ten minutes to get started.",
  " Worth it just for the What-If page, honestly.",
  " Been telling everyone in my group chat.",
  " My only regret is not starting sooner.",
  " Just run it a few months and you'll see.",
];

const DAYS_FLOOR = 1;
const DAYS_SPAN = 150;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function ratingBucket(rand: number): number {
  if (rand < 0.57) return 5;
  if (rand < 0.82) return 4;
  if (rand < 0.93) return 3;
  if (rand < 0.98) return 2;
  return 1;
}

/** 200 simulated student reviews, stable across loads and deploys. */
export const SEED_REVIEWS: Review[] = (() => {
  const rand = lcg(20261021);
  const total = 200;
  const reviews: Review[] = [];
  const usedPositive: number[] = [];
  const usedMixed: number[] = [];
  const usedCritical: number[] = [];

  const pickFresh = (pool: string[], used: number[]) => {
    if (used.length >= pool.length) used.length = 0;
    let i = Math.floor(rand() * pool.length);
    while (used.includes(i)) i = (i + 1) % pool.length;
    used.push(i);
    return pool[i];
  };

  for (let i = 0; i < total; i++) {
    const rating = ratingBucket(rand());
    const base =
      rating >= 4 ? pickFresh(POSITIVE, usedPositive)
      : rating === 3 ? pickFresh(MIXED, usedMixed)
      : pickFresh(CRITICAL, usedCritical);
    const suffix = rating === 5 ? SUFFIXES[Math.floor(rand() * SUFFIXES.length)] : "";
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${String.fromCharCode(65 + Math.floor(rand() * 26))}.`;
    const dayAgo = DAYS_FLOOR + (i / total) * DAYS_SPAN + rand() * 2;
    const at = new Date(Date.now() - dayAgo * 24 * 60 * 60 * 1000 - Math.floor(rand() * 6) * 60 * 60 * 1000);
    reviews.push({
      id: `seed-${i}-${rand().toString(36).slice(2, 8)}`,
      name,
      rating,
      body: `${base}${suffix}`,
      at: at.toISOString(),
      kind: "seed",
    });
  }
  return reviews;
})();
