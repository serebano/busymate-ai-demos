# Build context is the REPO ROOT (see scripts/deploy.sh) so this can pull in
# the shared server modules from sites/_shared/backend/.
FROM node:20-alpine
WORKDIR /app
COPY sites/_shared/backend/mcp-identity-server.mjs ./_shared/mcp-identity-server.mjs
COPY sites/_shared/backend/tool-schema.mjs ./_shared/tool-schema.mjs
COPY sites/_shared/backend/actor.mjs ./_shared/actor.mjs
# busymate-devtools#3054: the shared agents.json merge — never a copy.
COPY sites/_shared/gen-agent-files.mjs ./gen-agent-files.mjs
COPY sites/_shared/backend/tool-schema.mjs ./backend/tool-schema.mjs
COPY sites/webflow/backend/index.mjs ./index.mjs
COPY sites/webflow/backend/tools.mjs ./tools.mjs
COPY sites/webflow/backend/store.mjs ./store.mjs
COPY sites/webflow/backend/webflowContent.mjs ./webflowContent.mjs
COPY sites/webflow/backend/wellKnown.mjs ./wellKnown.mjs
ENV NODE_ENV=production
EXPOSE 8118
CMD ["node", "index.mjs"]
