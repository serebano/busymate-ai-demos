# Build context is the REPO ROOT (see scripts/deploy.sh) so this can pull in
# the shared server module from sites/_shared/backend/. Copy the WHOLE
# directory (not individual files) — a shared module gaining a new sibling
# import (e.g. actor.mjs) must never silently break a demo whose Dockerfile
# still lists files one by one (this broke shopify live on 2026-09-11).
FROM node:20-alpine
WORKDIR /app
COPY sites/_shared/backend/ ./_shared/
# The action-card builder is imported as ../ui/ from _shared/, so it keeps that relative position.
COPY sites/_shared/ui/form-card.mjs ./ui/form-card.mjs
COPY sites/shopify/backend/index.mjs ./index.mjs
COPY sites/shopify/backend/catalog.mjs ./catalog.mjs
# Published into the docroot's /.well-known at boot (the static rsync skips it).
COPY sites/shopify/public/agents.json ./agents.json
ENV NODE_ENV=production
EXPOSE 8101
CMD ["node", "index.mjs"]
