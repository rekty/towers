#!/usr/bin/env sh
# Publishes one Pollinations agent per company. Requires a key with account:keys
# and community publisher access for the account that owns the agents.
#   POLLINATIONS_API_KEY=sk_... sh agents/publish.sh

set -eu
: "${POLLINATIONS_API_KEY:?set POLLINATIONS_API_KEY first}"

npx @pollinations/cli agents create --config agents/sky-brew-labs.json \n  --name "towers-sky-brew-labs" --title "Sky Brew Labs" --visibility public

npx @pollinations/cli agents create --config agents/neon-games-studio.json \n  --name "towers-neon-games-studio" --title "Neon Games Studio" --visibility public

npx @pollinations/cli agents create --config agents/verdant-analytics.json \n  --name "towers-verdant-analytics" --title "Verdant Analytics" --visibility public

npx @pollinations/cli agents create --config agents/atlas-freight.json \n  --name "towers-atlas-freight" --title "Atlas Freight" --visibility public

npx @pollinations/cli agents create --config agents/lumen-health.json \n  --name "towers-lumen-health" --title "Lumen Health" --visibility public

npx @pollinations/cli agents create --config agents/quill-co.json \n  --name "towers-quill-co" --title "Quill & Co." --visibility public

npx @pollinations/cli agents create --config agents/orbit-education.json \n  --name "towers-orbit-education" --title "Orbit Education" --visibility public

npx @pollinations/cli agents create --config agents/helios-grid.json \n  --name "towers-helios-grid" --title "Helios Grid" --visibility public

npx @pollinations/cli agents create --config agents/kite-fulfilment.json \n  --name "towers-kite-fulfilment" --title "Kite Fulfilment" --visibility public

npx @pollinations/cli agents create --config agents/prism-media.json \n  --name "towers-prism-media" --title "Prism Media" --visibility public

npx @pollinations/cli agents create --config agents/foundry-legal.json \n  --name "towers-foundry-legal" --title "Foundry Legal" --visibility public
