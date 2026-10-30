// BYOP — the visitor's own Pollen.
//
// The <polli-connect> widget from @pollinations/ui runs the OAuth code flow and
// keeps the user's scoped sk_ key in sessionStorage. This module is the only
// place the rest of the app reads it from: agent runs forward it to /api/agent,
// which spends the visitor's Pollen instead of the app owner's.

const el = document.getElementById("byop");

let apiKey = null;
let balance = null;
const listeners = new Set();

export function onByopChange(fn) {
  listeners.add(fn);
}

export function userKey() {
  return apiKey;
}

export function isConnected() {
  return Boolean(apiKey);
}

export function liveBalance() {
  return balance;
}

function publish() {
  listeners.forEach((fn) => fn({ connected: isConnected(), balance }));
}

export async function refreshBalance() {
  if (!apiKey) return (balance = null);
  try {
    const res = await fetch("https://gen.pollinations.ai/account/balance", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return (balance = null);
    const data = await res.json();
    balance = typeof data.balance === "number" ? data.balance : null;
  } catch {
    balance = null;
  }
  publish();
  return balance;
}

if (el) {
  apiKey = el.apiKey || null;
  el.addEventListener("change", () => {
    apiKey = el.apiKey || null;
    balance = null;
    publish();
    if (apiKey) refreshBalance();
  });
  if (apiKey) refreshBalance();
}
