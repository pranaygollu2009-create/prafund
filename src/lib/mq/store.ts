import { useCallback, useEffect, useState } from "react";
import { CAREERS, EVENTS } from "./data";
import { expenses, netWorth, type GameState } from "./engine";
import { useSession } from "./auth";
import { clearCloudSave, loadCloudSave, writeCloudSave } from "./cloud";

const KEY = "moneyquest.save.v1";

export function newGame(careerId: string, housing: string, transport: string, lifestyle: string): GameState {
  const career = CAREERS.find((c) => c.id === careerId) ?? CAREERS[0]!;
  const base: GameState = {
    career: career.id,
    takeHome: career.takeHome,
    housing,
    transport,
    lifestyle,
    month: 1,
    cash: 800,
    savings: 0,
    investments: 0,
    debt: 0,
    xp: 0,
    history: [{ month: 0, netWorth: 800 }],
    lessonsDone: [],
    achievements: [],
    plan: { save: 500, invest: 300, extraDebt: 0 },
    eventIndex: 0,
    lastMonth: null,
  };
  return base;
}

function award(s: GameState, id: string) {
  if (!s.achievements.includes(id)) s.achievements.push(id);
}

export function advanceMonth(prev: GameState, eventChoiceId: string | null): GameState {
  const s: GameState = structuredClone(prev);
  const e = expenses(s);
  const leftover = s.takeHome - e.total;
  const save = Math.min(s.plan.save, Math.max(0, leftover));
  const invest = Math.min(s.plan.invest, Math.max(0, leftover - save));
  const extraDebt = Math.min(s.plan.extraDebt, Math.max(0, leftover - save - invest), s.debt);

  s.cash += leftover - save - invest - extraDebt;
  s.savings += save;
  s.investments += invest;
  s.debt = Math.max(0, s.debt - extraDebt);

  // simulated monthly growth (hypothetical, randomised)
  const growth = s.investments * (0.006 + (Math.random() - 0.5) * 0.05);
  s.investments = Math.max(0, s.investments + growth);
  s.savings *= 1 + 0.03 / 12;
  s.debt *= 1 + 0.19 / 12;

  let eventNote = "A quiet month — no surprises.";
  const ev = EVENTS[s.eventIndex % EVENTS.length]!;
  if (eventChoiceId) {
    const choice = ev.choices.find((c) => c.id === eventChoiceId);
    if (choice) {
      s.cash += choice.cash ?? 0;
      s.savings += choice.savings ?? 0;
      s.debt = Math.max(0, s.debt + (choice.debt ?? 0));
      if (choice.incomeChange) s.takeHome += choice.incomeChange;
      eventNote = `${ev.emoji} ${ev.title}: ${choice.result}`;
    }
  }
  if (s.cash < 0) {
    const gap = -s.cash;
    const fromSavings = Math.min(s.savings, gap);
    s.savings -= fromSavings;
    s.cash += fromSavings;
    if (s.cash < 0) {
      s.debt += -s.cash;
      s.cash = 0;
      eventNote += " Your cash ran short, so the gap went onto simulated credit.";
    }
  }

  const before = netWorth(prev);
  s.eventIndex += 1;
  s.month += 1;
  s.xp += 150;
  s.history = [...s.history, { month: prev.month, netWorth: Math.round(netWorth(s)) }];
  s.lastMonth = {
    income: s.takeHome,
    spent: e.total,
    saved: save,
    invested: invest,
    change: Math.round(netWorth(s) - before),
    eventNote,
  };

  award(s, "first-paycheck");
  if (s.savings >= 5000) award(s, "saver");
  if (s.investments > 0) award(s, "investor");
  if (s.month > 6) award(s, "streak");
  if (s.lessonsDone.length >= 4) award(s, "money-smart");
  return s;
}

function readLocal(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

function writeLocal(next: GameState | null) {
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Keeps the simulation save in the browser, and mirrors it to the player's
 * account when they are signed in so progress follows them between devices.
 */
export function useGame() {
  const { user } = useSession();
  const [state, setState] = useState<GameState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    let alive = true;
    const local = readLocal();
    if (!userId) {
      setState(local);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    loadCloudSave(userId)
      .then((cloud) => {
        if (!alive) return;
        if (cloud) {
          const winner = local && local.month > cloud.month ? local : cloud;
          setState(winner);
          writeLocal(winner);
          if (winner !== cloud) void writeCloudSave(userId, winner);
        } else {
          setState(local);
          if (local) void writeCloudSave(userId, local);
        }
      })
      .catch(() => {
        if (alive) setState(local);
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const save = useCallback(
    (next: GameState | null) => {
      setState(next);
      writeLocal(next);
      if (!userId) return;
      if (next) void writeCloudSave(userId, next);
      else void clearCloudSave(userId);
    },
    [userId],
  );

  return { state, loaded, save };
}
