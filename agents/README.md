# Agents

One Pollinations prompt agent per company, so every floor of the tower runs on its
own published agent instead of a model the page happens to pick. The callable id
is `community/rekty/towers-<company>`, which is exactly what `api.js` sends.

All eleven are published and public, and each one has been called once with a real
prompt (see the table). `publish.sh` recreates them from the JSON configs; it needs
an authenticated Polli CLI whose account has community publisher access:

```sh
npx @pollinations/cli login
sh agents/publish.sh
```

| Agent id | Callable model | Agent id (API) |
|---|---|---|
| `sky-brew-labs` | `community/rekty/towers-sky-brew-labs` | `c76cd280-3416-4d64-a690-b243a0290a0f` |
| `neon-games-studio` | `community/rekty/towers-neon-games-studio` | `abd95748-37a3-4e7b-9781-9a68d3a6c32a` |
| `verdant-analytics` | `community/rekty/towers-verdant-analytics` | `1965eb27-8867-476e-8618-23e93266fd81` |
| `atlas-freight` | `community/rekty/towers-atlas-freight` | `7bdb9709-2f2e-44bc-a8ec-aa6a36764608` |
| `lumen-health` | `community/rekty/towers-lumen-health` | `5eb7b0ac-953c-478c-b73e-04a3f56706b5` |
| `quill-co` | `community/rekty/towers-quill-co` | `7532bbcf-e639-4897-9716-9138cd2ced17` |
| `orbit-education` | `community/rekty/towers-orbit-education` | `fadfa812-c43a-4636-8092-ca5178fac846` |
| `helios-grid` | `community/rekty/towers-helios-grid` | `1fad128a-5186-460a-b233-c77f1c819da8` |
| `kite-fulfilment` | `community/rekty/towers-kite-fulfilment` | `8b8a46f3-db14-49e7-8b1a-8eb15cb54b72` |
| `prism-media` | `community/rekty/towers-prism-media` | `ab6bd229-9095-4fc6-b919-9e1c5d4dfd02` |
| `foundry-legal` | `community/rekty/towers-foundry-legal` | `7e5aaf94-394a-4c0e-aaae-ce9c11f7ea87` |

Creating a name that already exists fails, so to change an agent use:

```sh
npx @pollinations/cli agents update <id> --config agents/<slug>.json
```

The configs carry the system prompt, the base model and no MCP servers. Titles and
descriptions are passed as flags because they are listing fields, not runtime ones.
Without these agents published the page still loads; a run then reports the model
as unknown instead of falling back to invented copy.
