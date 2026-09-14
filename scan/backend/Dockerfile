# Build context is the REPO ROOT (see scripts/deploy.sh) so this can pull in
# the shared server modules from sites/_shared/backend/.
FROM node:20-alpine
WORKDIR /app
COPY sites/_shared/backend/mcp-identity-server.mjs ./_shared/mcp-identity-server.mjs
COPY sites/_shared/backend/tool-schema.mjs ./_shared/tool-schema.mjs
COPY sites/_shared/backend/actor.mjs ./_shared/actor.mjs
COPY sites/scan/backend/index.mjs ./index.mjs
COPY sites/scan/backend/tools.mjs ./tools.mjs
COPY sites/scan/backend/store.mjs ./store.mjs
# Published into the docroot's /.well-known at boot (the static rsync skips it).
COPY sites/scan/public/agents.json ./agents.json
ENV NODE_ENV=production
EXPOSE 8104
CMD ["node", "index.mjs"]
