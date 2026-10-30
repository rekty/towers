// Browser client for agent runs.
//
// Talks to the /api/agent proxy so the model call is assembled server-side.
// When a visitor has connected their Pollen wallet (BYOP), the call carries
// their scoped key and their own Pollen pays for it; otherwise it falls back to
// a clearly-labelled DEMO mode so the tower stays playable.

import { userKey } from "./byop.js";

const DEMO = {
  "Market Scout": "Green arabica prices softened ~4% this week; robusta held flat. Ethiopian Yirgacheffe lots are thinning as the harvest window closes. Fair-trade certified supply is up slightly, easing one sourcing bottleneck.",
  "Roast Analyst": "Experiment: Kenya Nyeri AA, charge 196°C, 11% development, drop at first crack +1:12. Expect bright blackcurrant acidity with a syrupy finish; risk of under-development if airflow stays low.",
  Outreach: "Hi [Cafe] — we roast small-lot specialty beans within 48h of dispatch, and this week's Yirgacheffe is moving fast. Want a free 250g sample for your bar team to taste?",
  "Game Designer": "Core loop: one-thumb 'charge and release' steering where holding builds speed but shrinks your hitbox. Addictive because every run feels like it was one input away from a new personal best.",
  "Build Engineer": "1) Map a circle collider whose radius = base / (1 + chargeTime). 2) Bind pointerdown/up to charge state, interpolate radius each frame. 3) Ship a 60-second build with a local leaderboard before adding anything else.",
  Community: "New mechanic drop: hold to charge, release to dodge — the tighter your hitbox, the crazier your score. Who's beating 250k first? Patch notes in #announcements.",
  "Data Researcher": "EU CBAM reporting shifts for small importers this quarter. California SB 253 scope clarifications land for mid-size manufacturers. UK SECR threshold guidance was quietly updated — recheck your qualifying criteria.",
  "Report Writer": "Your furniture line can cut reporting prep from three weeks to two days. We map your supplier data once, then refresh compliance figures automatically each quarter.",
  "Route Optimizer": "Consolidate the Tuesday coastal run into a single loop starting northbound — cuts deadhead miles ~14%. Shift the second van to Thu/Fri to match demand.",
  "Sales Agent": "We helped a regional fleet cut idle mileage 12% in one quarter without new hardware. Worth a 15-minute look at your Tuesday route data?",
  "Intake Designer": "1) 'What's the one thing you'd most like to get from tomorrow's visit?' 2) 'Anything that's made it hard to get here before?' 3) 'How should we remind you — text, call, or email?'",
  Compliance: "Never let an automated message reveal a diagnosis or test result — confirm recipient identity before sending anything clinical, and keep a human review gate for content that mentions conditions.",
  Copywriter: "1) 'Wear them out, not the planet.' 2) 'Every mile, less impact.' 3) 'Built to be rebuilt.'",
  Strategist: "Option 1 wins with Gen-Z: it is blunt, shareable and works as a chant. Options 2 and 3 read corporate; 1 has meme potential without trying too hard.",
  "Curriculum Agent": "1) What a prompt actually is. 2) Structure: role, task, constraints. 3) Iterating: why your second prompt beats your first. 4) Guardrails: tone, format, verification.",
  "Tutor Agent": "Exercise: rewrite 'write something about coffee' as a prompt with a role, a format and a length. Model answer: 'Copywriter: write a 30-word product blurb for single-origin coffee, warm tone, end with a call to order.'",
  "Forecast Agent": "Expect a soft midweek dip from cloud cover, recovering into a strong weekend. Assumes the front passes by Thursday — if it stalls, revise yield down ~8%.",
  "Ops Agent": "Move inverter maintenance from peak Sunday to Tuesday morning — historically raises weekly uptime ~0.4% and avoids the highest-yield generation window.",
  Negotiator: "We're ready to sign for 24 months, but we need a 12-month price lock and volume tier at 15 units. In return we'll case-study your robot in our pilot warehouse.",
  Analyst: "Lease when cash is scarcer than utilisation certainty; buy once utilization stays above ~70% for two quarters — that's the crossover where ownership cost beats lease cost.",
  "Script Agent": "Hook (0-3s): 'Your 5pm dinner takes 4 minutes.' Beat 1: ingredients already portioned. Beat 2: one pan, timer running, you're plating before the kettle boils.",
  "Growth Agent": "Experiment: shift posting from 6pm to 7:30pm weekdays and hold content constant for one week. Watch completion rate, not likes — that's the metric tied to installs.",
  "Triage Agent": "1) Auto-renewal with >30-day cancellation windows. 2) Unlimited indemnity or uncapped liability. 3) Unilateral price changes mid-term with no cap.",
  Summariser: "This MSA lets the vendor change terms with 15 days' notice and caps their liability at one month of fees while leaving yours uncapped. Push for mutual caps and a longer change window before signing.",
};

export async function runAgent(floor, agent) {
  const key = userKey();
  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({ company: floor.name, role: agent.role, task: agent.task }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.output) return { output: data.output, live: true };
    throw new Error(data.error || "No output");
  } catch (err) {
    return { output: DEMO[agent.role] || "Task logged. Awaiting model response.", live: false, error: err.message };
  }
}
