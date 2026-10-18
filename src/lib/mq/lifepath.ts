import { CAREERS, HOUSING, LIFESTYLE, TRANSPORT } from "./data";

export type Education = {
  id: string;
  label: string;
  earningsBoost: number; // added to takeHome each month
  debtAdded: number; // added once, up front
  months: number; // months before the first paycheck arrives
  note: string;
};

export const EDUCATIONS: Education[] = [
  {
    id: "none",
    label: "Start working right away",
    earningsBoost: 0,
    debtAdded: 0,
    months: 0,
    note: "First paycheck arrives immediately.",
  },
  {
    id: "community",
    label: "Two-year community college",
    earningsBoost: 850,
    debtAdded: 6000,
    months: 24,
    note: "Modest simulated cost, decent earnings boost after graduation.",
  },
  {
    id: "university",
    label: "Four-year university",
    earningsBoost: 1600,
    debtAdded: 18000,
    months: 48,
    note: "Highest boost and the largest simulated student debt.",
  },
  {
    id: "bootcamp",
    label: "Six-month bootcamp",
    earningsBoost: 700,
    debtAdded: 4200,
    months: 6,
    note: "Short and cheap, smaller boost.",
  },
];

export type Location = {
  id: string;
  label: string;
  rentMultiplier: number; // multiplies housing cost
  salaryMultiplier: number; // multiplies take-home
  note: string;
};

export const LOCATIONS: Location[] = [
  {
    id: "hometown",
    label: "Small town / hometown",
    rentMultiplier: 0.7,
    salaryMultiplier: 0.92,
    note: "Low cost of living, slightly lower simulated wages.",
  },
  {
    id: "midsize",
    label: "Mid-size city",
    rentMultiplier: 1,
    salaryMultiplier: 1,
    note: "The baseline for every number in the simulator.",
  },
  {
    id: "bigcity",
    label: "Big city",
    rentMultiplier: 1.6,
    salaryMultiplier: 1.15,
    note: "More opportunity, much higher rent.",
  },
];

export type LifePathChoices = {
  careerId: string;
  educationId: string;
  locationId: string;
  housingId: string;
};

/**
 * Projects five simulated years. Pure function of the choices — the same
 * inputs always produce the same outputs, which is what lets the What-If
 * engine compare two paths fairly (no randomness).
 */
export function projectLifePath(choices: LifePathChoices): LifePathResult {
  const career = CAREERS.find((c) => c.id === choices.careerId) ?? CAREERS[0]!;
  const edu = EDUCATIONS.find((e) => e.id === choices.educationId) ?? EDUCATIONS[0]!;
  const loc = LOCATIONS.find((l) => l.id === choices.locationId) ?? LOCATIONS[1]!;
  const housing = HOUSING.find((h) => h.id === choices.housingId) ?? HOUSING[1]!;

  let savings = 0;
  let debt = edu.debtAdded;
  let cash = 800;
  let rent = Math.round(housing.cost * loc.rentMultiplier);
  let takeHome = career.takeHome * loc.salaryMultiplier;

  // Raise each simulated year (reviewed, not guaranteed — it's a model).
  const years = 5;
  const yearsOut: LifePathYear[] = [];
  const raise = 1.025; // 2.5%/yr step increase

  for (let year = 1; year <= years; year++) {
    let earned = 0;
    let spent = 0;
    let saved = 0;
    for (let month = 1; month <= 12; month++) {
      const monthsIntoSim = (year - 1) * 12 + month;
      // While studying: odds and ends only, transportation/lifestyle paused.
      if (monthsIntoSim <= edu.months) {
        cash -= 120;
        spent += 120;
        earned = 0;
        if (cash < 0) {
          debt += -cash;
          cash = 0;
        }
      } else {
        const baseExpenses = rent + Math.round(TRANSPORT[1]!.cost * 1) + LIFESTYLE[1]!.cost;
        const total = baseExpenses;
        const leftover = takeHome - total;
        earned += takeHome;
        spent += total;
        const save = Math.max(0, leftover) * 0.6; // fixed 60% of leftover saved
        cash += Math.max(0, leftover) * 0.4;
        savings += save;
        saved += save;
        if (debt > 0) {
          const pay = Math.min(debt, Math.max(200, leftOverForDebt(leftover, save)));
          debt -= pay;
        }
        debt *= 1 + 0.05 / 12; // student loans accrue gently
      }
    }
    takeHome *= raise;
    rent *= 1.02;
    debt = Math.max(0, debt);
    yearsOut.push({
      year,
      ageLabel: `Year ${year}`,
      earned: Math.round(earned),
      spent: Math.round(spent),
      saved: Math.round(saved),
      savings: Math.round(savings),
      debt: Math.round(debt),
      netWorth: Math.round(cash + savings - debt),
      livingAtHome: housing.id === "parents",
    });
  }

  return {
    choices,
    careerTitle: career.title,
    educationLabel: edu.label,
    locationLabel: loc.label,
    housingLabel: housing.label,
    studentDebt: edu.debtAdded,
    incomeWhileStudying: edu.months === 0,
    takeHomeFirstJob: Math.round(career.takeHome * loc.salaryMultiplier + edu.earningsBoost),
    years: yearsOut,
    finalNetWorth: yearsOut[yearsOut.length - 1]!.netWorth,
    totalSaved: yearsOut[years - 1]!.savings,
    monthsStudying: edu.months,
  };
}

function leftOverForDebt(leftover: number, save: number) {
  return Math.max(0, leftover - save);
}

export type LifePathYear = {
  year: number;
  ageLabel: string;
  earned: number;
  spent: number;
  saved: number;
  savings: number;
  debt: number;
  netWorth: number;
  livingAtHome: boolean;
};

export type LifePathResult = {
  choices: LifePathChoices;
  careerTitle: string;
  educationLabel: string;
  locationLabel: string;
  housingLabel: string;
  studentDebt: number;
  incomeWhileStudying: boolean;
  takeHomeFirstJob: number;
  years: LifePathYear[];
  finalNetWorth: number;
  totalSaved: number;
  monthsStudying: number;
};
