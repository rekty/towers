# Agents

One Pollinations prompt agent per company, so a floor runs on its own published
agent instead of a model the page picks. The callable id is
`community/rekty/towers-<company>`, which is what `api.js` sends.

`publish.sh` creates them; it needs a key with `account:keys` and community
publisher access for the account that owns them:

```sh
POLLINATIONS_API_KEY=sk_... sh agents/publish.sh
```

Update an existing agent after editing its JSON (name, title and prompt live in
the config, the rest keeps its current value):

```sh
npx @pollinations/cli agents update <agent-id> --config agents/sky-brew-labs.json
```

Without the published agents the page still loads; a run reports the model as
unknown instead of falling back to invented copy.
