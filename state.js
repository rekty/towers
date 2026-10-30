// Game state: Pollen wallet, per-company performance, agent run log, decision queue.
// Persisted to localStorage so a visitor keeps their tower across reloads.

import { FLOORS } from "./data.js";

const KEY = "towers-state-v1";

const defaultState = () => ({
  pollen: 12, // start with enough for a few agent runs
  signedIn: false,
  ownerName: "",
  day: 1,
  companies: Object.fromEntries(
    FLOORS.filter((f) => !f.vacant).map((f) => [
      f.id,
      { revenue: f.economy.base, reputation: 50, log: [], pending: [], lastRun: 0 },
    ])
  ),
  applications: [],
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  save();
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return state;
}

export function spend(amount) {
  if (state.pollen < amount) return false;
  state.pollen -= amount;
  emit();
  return true;
}

export function earn(amount) {
  state.pollen += amount;
  emit();
}

export function signIn(name) {
  state.signedIn = true;
  state.ownerName = name || "Owner";
  emit();
}

export function signOut() {
  state.signedIn = false;
  emit();
}

// An agent finished a task: bank its outcome, roll the dice on the company's
// economy, and sometimes surface a decision that needs a human.
export function recordAgentRun(floorId, role, output, cost) {
  const c = state.companies[floorId];
  if (!c) return;
  const floor = FLOORS.find((f) => f.id === floorId);
  const delta = Math.round(
    (Math.random() - 0.42) * floor.economy.volatility * floor.economy.base * 0.15
  );
  c.revenue = Math.max(0, c.revenue + delta);
  c.reputation = Math.min(100, c.reputation + (delta > 0 ? 2 : -1));
  c.lastRun = Date.now();
  c.log.unshift({ day: state.day, role, output, delta, at: Date.now() });
  c.log = c.log.slice(0, 30);

  if (Math.random() < 0.3) {
    c.pending.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      question: makeDecisionQuestion(floor, role, delta),
      options: ["Approve", "Revise", "Hold"],
    });
  }
  emit();
}

function makeDecisionQuestion(floor, role, delta) {
  const trend = delta >= 0 ? "up" : "down";
  return `Revenue is trending ${trend}. The ${role} proposes their next move — approve, send back for revision, or hold?`;
}

export function resolveDecision(floorId, decisionId, choice) {
  const c = state.companies[floorId];
  if (!c) return;
  const idx = c.pending.findIndex((d) => d.id === decisionId);
  if (idx === -1) return;
  c.pending.splice(idx, 1);
  const bonus = choice === "Approve" ? 3 : choice === "Revise" ? 1 : 0;
  c.reputation = Math.min(100, c.reputation + bonus);
  if (bonus) c.revenue += bonus * 4;
  emit();
}

export function advanceDay() {
  state.day += 1;
  Object.values(state.companies).forEach((c) => {
    c.revenue = Math.max(0, Math.round(c.revenue * 0.995));
  });
  emit();
}

export function submitApplication(app) {
  state.applications.push({ ...app, day: state.day, at: Date.now() });
  emit();
}
