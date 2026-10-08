export type Career = {
  id: string;
  title: string;
  emoji: string;
  salary: number;
  takeHome: number;
  blurb: string;
};

export const CAREERS: Career[] = [
  {
    id: "software-developer",
    title: "Software Developer",
    emoji: "💻",
    salary: 82000,
    takeHome: 5100,
    blurb: "Builds apps and websites. Strong demand, often remote-friendly.",
  },
  {
    id: "financial-analyst",
    title: "Financial Analyst",
    emoji: "📊",
    salary: 72000,
    takeHome: 4500,
    blurb: "Studies numbers and forecasts to help companies decide.",
  },
  {
    id: "engineer",
    title: "Engineer",
    emoji: "🛠️",
    salary: 76000,
    takeHome: 4750,
    blurb: "Designs and tests physical or electrical systems.",
  },
  {
    id: "teacher",
    title: "Teacher",
    emoji: "📚",
    salary: 52000,
    takeHome: 3350,
    blurb: "Educates students. Steady schedule, summers off in many districts.",
  },
  {
    id: "nurse",
    title: "Nurse",
    emoji: "🩺",
    salary: 78000,
    takeHome: 4850,
    blurb: "Cares for patients. Shift work with overtime opportunities.",
  },
  {
    id: "accountant",
    title: "Accountant",
    emoji: "🧾",
    salary: 65000,
    takeHome: 4100,
    blurb: "Tracks money for businesses and people.",
  },
  {
    id: "marketing-specialist",
    title: "Marketing Specialist",
    emoji: "📣",
    salary: 60000,
    takeHome: 3800,
    blurb: "Grows an audience for a product or brand.",
  },
  {
    id: "entrepreneur",
    title: "Entrepreneur",
    emoji: "🚀",
    salary: 45000,
    takeHome: 2900,
    blurb: "Runs their own business. Lower and bumpier income at the start.",
  },
];

export type Option = {
  id: string;
  label: string;
  cost: number;
  note: string;
};

export const HOUSING: Option[] = [
  { id: "parents", label: "Live with parents", cost: 300, note: "Cheapest option, less independence" },
  { id: "roommates", label: "Roommates", cost: 800, note: "Split rent and utilities" },
  { id: "apartment", label: "Apartment alone", cost: 1450, note: "Your own space, higher cost" },
  { id: "house", label: "House", cost: 2100, note: "More room, more upkeep" },
];

export const TRANSPORT: Option[] = [
  { id: "bike", label: "Walk / Bike", cost: 40, note: "Almost free, limited range" },
  { id: "transit", label: "Public transport", cost: 110, note: "Monthly pass" },
  { id: "used-car", label: "Used car", cost: 350, note: "Gas, insurance, repairs" },
  { id: "new-car", label: "New car", cost: 620, note: "Car payment plus insurance" },
];

export const LIFESTYLE: Option[] = [
  { id: "minimal", label: "Minimal", cost: 450, note: "Cook at home, few extras" },
  { id: "balanced", label: "Balanced", cost: 750, note: "Some eating out and fun" },
  { id: "comfortable", label: "Comfortable", cost: 1100, note: "Regular treats and travel" },
  { id: "luxury", label: "Luxury", cost: 1650, note: "Best of everything, little left over" },
];

export type LifeEvent = {
  id: string;
  emoji: string;
  title: string;
  story: string;
  choices: {
    id: string;
    label: string;
    cash?: number;
    savings?: number;
    debt?: number;
    incomeChange?: number;
    result: string;
  }[];
};

export const EVENTS: LifeEvent[] = [
  {
    id: "car-repair",
    emoji: "🚗",
    title: "Car repair",
    story: "Your car needs an unexpected repair. Cost: $850.",
    choices: [
      {
        id: "savings",
        label: "Pay $850 from savings",
        savings: -850,
        result: "Your emergency savings did their job. No interest owed.",
      },
      {
        id: "credit",
        label: "Put $850 on simulated credit",
        debt: 850,
        result: "Savings untouched, but the balance now grows with interest.",
      },
      {
        id: "delay",
        label: "Delay the repair",
        debt: 300,
        result: "You saved cash now, but a bigger problem was added later.",
      },
    ],
  },
  {
    id: "certification",
    emoji: "💼",
    title: "Career opportunity",
    story: "Your employer offers a professional certification for $500. It could raise simulated take-home pay by $300/month.",
    choices: [
      {
        id: "accept",
        label: "Accept ($500 now)",
        cash: -500,
        incomeChange: 300,
        result: "Upfront cost, higher simulated monthly income from now on.",
      },
      { id: "decline", label: "Decline", result: "You kept the cash and your income stayed the same." },
    ],
  },
  {
    id: "vacation",
    emoji: "✈️",
    title: "Trip with friends",
    story: "Your friends are planning a trip. The full trip costs $1,200.",
    choices: [
      { id: "go", label: "Go on the full trip", cash: -1200, result: "Great memories, a smaller cushion this month." },
      { id: "cheap", label: "Plan a cheaper trip ($400)", cash: -400, result: "Most of the fun for a third of the cost." },
      { id: "skip", label: "Skip it", result: "Nothing spent. Tradeoffs are personal, not right or wrong." },
    ],
  },
  {
    id: "bonus",
    emoji: "🎉",
    title: "Small bonus",
    story: "Your simulated employer pays a $700 performance bonus.",
    choices: [
      { id: "save", label: "Move it to savings", savings: 700, result: "Your emergency fund got stronger." },
      { id: "spend", label: "Spend it", result: "Enjoyed now, nothing added to net worth." },
      { id: "debt", label: "Pay down debt", debt: -700, result: "Less debt means less interest later." },
    ],
  },
  {
    id: "medical",
    emoji: "🏥",
    title: "Medical bill",
    story: "A clinic visit leaves you with a $420 bill.",
    choices: [
      { id: "savings", label: "Pay from savings", savings: -420, result: "Handled without borrowing." },
      { id: "credit", label: "Use simulated credit", debt: 420, result: "Paid later, with interest added." },
    ],
  },
  {
    id: "moving",
    emoji: "🏠",
    title: "Moving decision",
    story: "Your lease is ending. A cheaper place would cut housing by $250/month but adds a $600 moving cost.",
    choices: [
      {
        id: "move",
        label: "Move to the cheaper place",
        cash: -600,
        incomeChange: 250,
        result: "One-time cost now, more room in your budget every month.",
      },
      { id: "stay", label: "Stay put", result: "No moving costs, expenses unchanged." },
    ],
  },
];

export const LESSONS = [
  {
    id: "compound",
    title: "What is compound growth?",
    minutes: 2,
    body: "Compound growth means your money earns a return, and then that return earns a return too. Over long periods this snowballs, which is why time matters more than timing.",
    question: "You invest $1,000 and it grows 10% a year. After year two, roughly how much do you have?",
    options: ["$1,100", "$1,200", "$1,210"],
    answer: 2,
    why: "Year one adds $100. Year two grows the new $1,100 by 10%, adding $110 — a total of $1,210.",
    xp: 100,
  },
  {
    id: "emergency",
    title: "Why an emergency fund comes first",
    minutes: 2,
    body: "An emergency fund is cash set aside for surprises like a car repair or lost income. A common starting target is three months of expenses.",
    question: "Your monthly expenses are $2,000. A three-month emergency fund is about…",
    options: ["$600", "$2,000", "$6,000"],
    answer: 2,
    why: "Three months of $2,000 expenses is $6,000 in easily reachable cash.",
    xp: 100,
  },
  {
    id: "diversify",
    title: "Diversification in one minute",
    minutes: 1,
    body: "Diversification means spreading money across many investments so one bad outcome does not sink everything. An index fund holds hundreds of companies at once.",
    question: "Which portfolio is most diversified?",
    options: ["One tech stock", "Three tech stocks", "A broad-market index fund"],
    answer: 2,
    why: "A broad-market fund holds many companies across many industries.",
    xp: 100,
  },
  {
    id: "inflation",
    title: "How inflation changes your money",
    minutes: 2,
    body: "Inflation is the general rise in prices over time. When prices rise, the same dollar buys less, so cash sitting still loses purchasing power.",
    question: "What generally happens to purchasing power when inflation rises?",
    options: ["It rises", "It falls", "It stays the same"],
    answer: 1,
    why: "Higher prices mean each dollar buys fewer goods, so purchasing power falls.",
    xp: 100,
  },
  {
    id: "credit",
    title: "Credit cards and interest",
    minutes: 2,
    body: "A credit card is a short-term loan. Paid in full each month it costs nothing extra; carried over, the unpaid balance grows at the card's APR.",
    question: "APR stands for…",
    options: ["Annual Percentage Rate", "Average Payment Ratio", "Applied Principal Return"],
    answer: 0,
    why: "APR is the yearly cost of borrowing, shown as a percentage.",
    xp: 100,
  },
  {
    id: "budget",
    title: "Building a budget that sticks",
    minutes: 2,
    body: "A budget is a plan for money you already expect to receive. One simple starting frame is roughly half for needs, some for wants, and a set slice for saving and investing.",
    question: "Which item is a need rather than a want?",
    options: ["Streaming subscription", "Rent", "Concert tickets"],
    answer: 1,
    why: "Rent keeps a roof over your head, so it comes before optional spending.",
    xp: 100,
  },
];

export const GLOSSARY = [
  ["APR", "The yearly cost of borrowing money, written as a percentage."],
  ["Asset", "Something you own that has value, like savings or investments."],
  ["Liability", "Something you owe, like a loan or credit card balance."],
  ["Compound growth", "When returns earn returns of their own over time."],
  ["Diversification", "Spreading money across many investments to reduce risk."],
  ["Inflation", "The general rise in prices, which lowers what a dollar buys."],
  ["Liquidity", "How quickly something can be turned into cash without losing value."],
  ["Volatility", "How much an investment's value has historically moved up and down."],
  ["Net worth", "What you own minus what you owe."],
  ["Principal", "The original amount invested or borrowed."],
  ["Interest", "The cost of borrowing, or the payment for lending."],
  ["Index fund", "A fund that holds a whole market of companies at once."],
  ["Monte Carlo simulation", "A method that runs many random scenarios to show a range of possible outcomes."],
  ["Emergency fund", "Cash set aside for unexpected costs."],
  ["Stock", "A small piece of ownership in a company."],
  ["Share", "One unit of a stock. Owning more shares means owning more of the company."],
  ["Bond", "A loan you give to a government or company that pays you interest."],
  ["Portfolio", "All the investments you own, taken together."],
  ["S&P 500", "An index tracking 500 large US companies, often used as a yardstick for 'the market'."],
  ["Benchmark", "Something you compare your results against, like the S&P 500."],
  ["P/E ratio", "Price divided by yearly earnings per share. Shows how much investors pay for each $1 of profit."],
  ["EPS", "Earnings per share: a company's profit divided by its number of shares."],
  ["Market cap", "The total value of all a company's shares (price × number of shares)."],
  ["Dividend", "Cash a company pays to its shareholders, usually from profits."],
  ["Dividend yield", "Yearly dividends as a percentage of the share price."],
  ["Sector", "The part of the economy a company belongs to, like technology or healthcare."],
  ["Fiscal year", "A company's 12-month accounting year. It doesn't have to match the calendar year."],
  ["Earnings report", "A company's regular update on its sales and profit, usually every three months."],
  ["Gain / loss", "How much an investment's value went up or down compared with what you paid."],
  ["Bull / bear market", "A bull market is a long rise in prices; a bear market is a long fall (about 20% or more)."],
  ["Crypto", "Digital currency that is very volatile and not backed by a government."],
  ["Return", "How much an investment earned or lost, usually shown as a percentage."],
] as const;

export const DEFS: Record<string, string> = Object.fromEntries(GLOSSARY);

export const DISCLAIMER =
  "Prafund is an educational financial simulation. Results are hypothetical and do not guarantee future investment performance or constitute personalized financial advice.";

export const SUPPORT_EMAIL = "pranaygollu2009@gmail.com";
