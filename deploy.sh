#!/usr/bin/env sh
# Deploys the static app to Cloudflare Pages.
#
# `wrangler pages deploy .` uploads the folder as-is and ignores .gitignore, so a
# stray .env is served at /.env on the live site. Copy the files to a staging
# directory without the secrets and deploy that instead.
set -eu

STAGE=$(mktemp -d)/towers
mkdir -p "$STAGE"
cp -a . "$STAGE"/
rm -rf "$STAGE/.env" "$STAGE/.env.local" "$STAGE/.git" "$STAGE/.wrangler" "$STAGE/node_modules"

echo "Deploying $STAGE (no .env, no .git)"
npx wrangler@3.90.0 pages deploy "$STAGE" --project-name towers --branch main --commit-dirty=true
