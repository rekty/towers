// Cloudflare Pages Function proxy: POST /api/agent
//
// Why a proxy: the model call and its price stay out of browser code.
// BYOP first: the visitor's own scoped key arrives in Authorization and pays
// for the run. POLLINATIONS_API_KEY is only a fallback the owner can set.

const GEN = "https://gen.pollinations.ai/v1/chat/completions";

const SYSTEM_PROMPTS = {
  "Market Scout": "You are the market scout of a small coffee company. Be concrete and terse.",
  "Roast Analyst": "You are a coffee roasting analyst. Be concrete and terse.",
  Outreach: "You are an outreach agent for a small business. Be concrete and terse.",
  "Game Designer": "You are a game designer at an indie studio. Be concrete and terse.",
  "Build Engineer": "You are a pragmatic solo engineer. Be concrete and terse.",
  Community: "You are a community manager. Be concrete and terse.",
  "Data Researcher": "You are a compliance researcher. Be concrete and terse.",
  "Report Writer": "You are a report writer. Be concrete and terse.",
  "Route Optimizer": "You are a logistics route optimizer. Be concrete and terse.",
  "Sales Agent": "You are a sales agent for logistics software. Be concrete and terse.",
  "Intake Designer": "You are a clinic patient-experience designer. Be concrete and terse.",
  Compliance: "You are a healthcare privacy reviewer. Be concrete and terse.",
  Copywriter: "You are a brand copywriter. Be concrete and terse.",
  Strategist: "You are a brand strategist. Be concrete and terse.",
  "Curriculum Agent": "You are a course curriculum designer. Be concrete and terse.",
  "Tutor Agent": "You are a patient tutor. Be concrete and terse.",
  "Forecast Agent": "You are an energy forecast analyst. Be concrete and terse.",
  "Ops Agent": "You are an operations engineer. Be concrete and terse.",
  Negotiator: "You are a B2B negotiator. Be concrete and terse.",
  Analyst: "You are a financial analyst. Be concrete and terse.",
  "Script Agent": "You are a short-form video scriptwriter. Be concrete and terse.",
  "Growth Agent": "You are a growth analyst. Be concrete and terse.",
  "Triage Agent": "You are a contract triage lawyer for startups. Be concrete and terse.",
  summariserFallback: "You are a legal summariser. Be concrete and terse.",
};

export async function onRequestPost({ request, env }) {
  const header = request.headers.get("Authorization") || "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : env.POLLINATIONS_API_KEY;
  if (!key) {
    return json({ error: "Connect your Pollen wallet to run agents." }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { company, role, task } = body || {};
  if (!company || !role || !task) {
    return json({ error: "company, role and task are required." }, 400);
  }
  if (typeof task !== "string" || task.length > 2000) {
    return json({ error: "task must be a string under 2000 chars." }, 400);
  }

  const system =
    SYSTEM_PROMPTS[role] || "You are an agent at a small company. Be concrete and terse.";

  const upstream = await fetch(GEN, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.TOWERS_MODEL || "openai",
      messages: [
        { role: "system", content: `${system} You work at "${company}".` },
        { role: "user", content: task },
      ],
      max_tokens: 220,
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return json({ error: `Upstream ${upstream.status}`, detail: text.slice(0, 300) }, 502);
  }

  const data = await upstream.json();
  const output = data?.choices?.[0]?.message?.content?.trim();
  if (!output) return json({ error: "Empty completion from model." }, 502);

  return json({ output });
}

export function onRequestOptions() {
  return new Response(null, {
    headers: { Allow: "POST, OPTIONS" },
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
