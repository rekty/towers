# Towers — a building of AI-run companies

[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai/?ref=badge)

Your own version of **Towers**: a building where every floor is one company, run by one
person and their AI agents. The agents do the daily work (research, outreach, reports) on
**Pollinations**, spend the visitor's own Pollen, and bring decisions that need a human back
to the owner. Visitors rotate a 3D tower, ride between floors, step into any office, browse
the directory and apply to rent the next office.

Live: **https://towers-3fx.pages.dev/**

![Towers](assets/screenshot.png)

Built for [QUEST #17999](https://github.com/pollinations/pollinations/issues/17999).

## Bring your own Pollen

The **Pollinations Connect** button in the top bar runs the OAuth code flow through
[`@pollinations/ui`](https://www.npmjs.com/package/@pollinations/ui) and hands back a scoped
`sk_` key with a 10-point budget and a 7-day expiry. That key stays in `sessionStorage`, and
every agent run forwards it to `/api/agent`, so the run is billed to the visitor, not to the
app owner. Disconnect and the tower falls back to demo Pollen so it stays playable.

Nothing secret ships in the page: the only key in the HTML is the publishable app key
(`pk_…`) the consent screen needs, and the model call itself is assembled in the Pages
Function.

## What's inside

| Piece | File | Does |
|---|---|---|
| 3D tower | `main.js` | Three.js scene: drag to rotate, scroll to zoom, click a floor, elevator follows your view |
| Companies | `data.js` | 12 floors of businesses + the one vacant office |
| Game state | `state.js` | Demo wallet, revenue/reputation, agent log, decision queue (localStorage) |
| Wallet | `byop.js` | Reads the connect widget's key, fetches the live Pollen balance |
| Agent client | `api.js` | Calls `/api/agent` with the visitor's key; labelled DEMO fallback without one |
| Proxy | `functions/api/agent.js` | Cloudflare Pages Function — assembles the model call, forwards the visitor's key |
| Local server | `server.mjs` | Zero-dependency dev server (static + the same proxy) |

## Run locally

```bash
cd towers
node server.mjs
# → http://127.0.0.1:4173
```

Agent runs need a Pollen wallet: click **Pollinations Connect**. For a local key instead, put
`POLLINATIONS_API_KEY=sk_yourkey` in `towers/.env` (gitignored) and restart — the proxy prefers
the visitor's own key over it.

`.env` is gitignored. **Never commit an `sk_` key or paste one into browser code.**

## How the loop plays

1. Connect a Pollen wallet (or sign in for the demo 12 Pollen).
2. Open a floor, press **Run the workday** — each agent spends its cost, calls Pollinations,
   and its report lands in the activity feed with a revenue delta.
3. ~30% of runs surface a **decision** (Approve / Revise / Hold) — the human part of the job.
   Approving pays reputation and revenue.
4. **Advance to next day** in the wallet for +1 demo Pollen; revenue drifts daily.
5. Floor 1 is vacant: submit a rental application (0.5 demo Pollen) to claim it.

## Deploy

```bash
npx wrangler pages deploy . --project-name towers
```

`wrangler.toml` points Pages at this folder, and `functions/` is picked up automatically.
The app key's redirect URI must be the deployed origin (`https://<project>.pages.dev/`).

## License

MIT — see [LICENSE](LICENSE).
