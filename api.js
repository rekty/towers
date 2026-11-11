// Browser client for agent runs.
//
// Every company is a published Pollinations agent — `community/rekty/towers-<company>`
// — so the page calls the model endpoint directly with the visitor's own scoped
// key. There is no server proxy and no owner key: a run either bills the visitor
// or it fails, and a failure is returned as a failure rather than padded with
// sample text.

import { userKey } from "./byop.js";

const ENDPOINT = "https://gen.pollinations.ai/v1/chat/completions";

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The catalog id of the agent that runs one company's floor. */
export function agentModel(floor) {
  return `community/rekty/towers-${slug(floor.name)}`;
}

/**
 * Runs one agent for one task.
 * Resolves to `{ output }` on success and `{ error }` on failure — never to
 * placeholder copy, because a demo answer hides a broken run.
 */
export async function runAgent(floor, agent) {
  const key = userKey();
  if (!key) {
    return { error: "Connect your Pollen wallet to run agents." };
  }

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: agentModel(floor),
        messages: [
          {
            role: "user",
            content: `Act as the ${agent.role} at "${floor.name}".\n\n${agent.task}`,
          },
        ],
        max_tokens: 220,
      }),
    });
  } catch (err) {
    return { error: `Network error: ${err.message}` };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const reason = detail.replace(/\s+/g, " ").slice(0, 160).trim();
    return { error: `HTTP ${res.status}${reason ? ` — ${reason}` : ""}` };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { error: "The reply was not valid JSON." };
  }

  const output = data?.choices?.[0]?.message?.content?.trim();
  if (!output) {
    return { error: "The model returned an empty reply." };
  }
  return { output };
}
