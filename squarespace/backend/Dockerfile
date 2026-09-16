# Build context is the REPO ROOT (see scripts/deploy.sh) so this can pull in
# the shared server module from sites/_shared/backend/. Copy the WHOLE
# directory (not individual files) — a shared module gaining a new sibling
# import must never silently break this demo (see sites/shopify/backend/Dockerfile).
FROM node:20-alpine
WORKDIR /app
COPY sites/_shared/backend/ ./_shared/
COPY sites/_shared/ui/form-card.mjs ./ui/form-card.mjs
# The static six-layer generator (busymate-devtools#3054) — never a copy of
# gen-agent-files.mjs's merge shape. gen-agent-files.mjs's own relative
# import ("./backend/tool-schema.mjs") is mirrored at ./backend/ alongside
# the flattened ./_shared/tool-schema.mjs the wholesale copy above already
# placed — same reasoning as sites/ghost/backend/Dockerfile.
COPY sites/_shared/gen-agent-files.mjs sites/_shared/gen-protocol-files.mjs sites/_shared/gen-robots-sitemap.mjs sites/_shared/webmcp-catalog.mjs ./
COPY sites/_shared/backend/tool-schema.mjs ./backend/tool-schema.mjs
COPY sites/squarespace/backend/index.mjs ./index.mjs
COPY sites/squarespace/backend/tools.mjs ./tools.mjs
COPY sites/squarespace/backend/tools.mjs sites/squarespace/backend/squarespace.mjs ./backend/
COPY sites/squarespace/backend/squarespace.mjs ./squarespace.mjs
COPY sites/squarespace/backend/wellKnown.mjs ./wellKnown.mjs
COPY sites/squarespace/agent-files.config.mjs ./agent-files.config.mjs
COPY sites/squarespace/knowledge.json ./knowledge.json
ENV NODE_ENV=production
EXPOSE 8111
CMD ["node", "index.mjs"]
