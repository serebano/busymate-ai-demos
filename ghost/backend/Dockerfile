# Build context is the REPO ROOT (see scripts/deploy.sh) so this can pull in
# the shared server modules from sites/_shared/backend/.
FROM node:20-alpine
WORKDIR /app
COPY sites/_shared/backend/mcp-identity-server.mjs ./_shared/mcp-identity-server.mjs
COPY sites/_shared/backend/tool-schema.mjs ./_shared/tool-schema.mjs
COPY sites/_shared/backend/actor.mjs ./_shared/actor.mjs
COPY sites/_shared/backend/agent-ready.mjs ./_shared/agent-ready.mjs
COPY sites/ghost/backend/index.mjs ./index.mjs
COPY sites/ghost/backend/tools.mjs ./tools.mjs
COPY sites/ghost/backend/store.mjs ./store.mjs
COPY sites/ghost/backend/agent-ready.mjs ./agent-ready.mjs
ENV NODE_ENV=production
EXPOSE 8117
CMD ["node", "index.mjs"]
