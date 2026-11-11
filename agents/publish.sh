#!/usr/bin/env sh
# Publishes one Pollinations prompt agent per company. Each floor of the tower
# then calls `community/rekty/towers-<company>` directly from the page.
#
# Needs an authenticated Polli CLI (`npx @pollinations/cli login`) whose account
# has community publisher access. Creating a name that already exists is an
# error, so check `npx @pollinations/cli agents list` before re-running; to change
# an existing agent use `agents update <id> --config agents/<slug>.json`.

set -eu

create() {
    npx @pollinations/cli agents create         --config "agents/$1.json"         --name "towers-$1"         --title "$2"         --description "$3"         --visibility public
}

create sky-brew-labs "Sky Brew Labs" "Staff of a specialty coffee roaster: sourcing, roast profiles, wholesale outreach."
create neon-games-studio "Neon Games Studio" "Staff of a two-person arcade studio: mechanics, weekend-sized builds, community posts."
create verdant-analytics "Verdant Analytics" "Staff of a compliance analytics firm: emission rules, executive summaries."
create atlas-freight "Atlas Freight" "Staff of a regional freight operator: route savings, cold outreach."
create lumen-health "Lumen Health" "Staff of a clinic network: intake questions and patient-messaging privacy."
create quill-co "Quill & Co." "Staff of a copywriting studio: taglines and the strategy behind them."
create orbit-education "Orbit Education" "Staff of a micro-course publisher: curricula and example exercises."
create helios-grid "Helios Grid" "Staff of a solar operator: yield forecasts and maintenance windows."
create kite-fulfilment "Kite Fulfilment" "Staff of a warehouse automation buyer: supplier terms, lease-or-buy."
create prism-media "Prism Media" "Staff of a short-form video studio: hooks, posting experiments."
create foundry-legal "Foundry Legal" "Staff of a contract triage service: risky clauses, founder-readable summaries."
