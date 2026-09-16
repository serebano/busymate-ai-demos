# Build context is the REPO ROOT (see scripts/deploy.sh) so this can pull in
# the shared server modules from sites/_shared/backend/.
FROM node:20-alpine
WORKDIR /app
COPY sites/_shared/backend/mcp-identity-server.mjs ./_shared/mcp-identity-server.mjs
COPY sites/_shared/backend/tool-schema.mjs ./_shared/tool-schema.mjs
COPY sites/_shared/backend/actor.mjs ./_shared/actor.mjs
COPY sites/_shared/backend/agent-ready.mjs ./_shared/agent-ready.mjs
# The static half of the six-layer agent-ready set (busymate-devtools#3053,
# #3054) — the SAME generators every static demo's build-demo.sh uses, never
# a copy, mirrored at the exact relative layout their own imports expect:
# agent-ready-static.mjs imports "../gen-agent-files.mjs" etc; gen-agent-files.mjs
# imports "./backend/tool-schema.mjs".
COPY sites/_shared/gen-agent-files.mjs sites/_shared/gen-protocol-files.mjs sites/_shared/gen-robots-sitemap.mjs sites/_shared/webmcp-catalog.mjs ./_gen/
COPY sites/_shared/backend/tool-schema.mjs sites/_shared/backend/agent-ready-static.mjs ./_gen/backend/
COPY sites/ghost/backend/index.mjs ./index.mjs
COPY sites/ghost/backend/tools.mjs ./tools.mjs
COPY sites/ghost/backend/store.mjs ./store.mjs
COPY sites/ghost/backend/agent-ready.mjs ./agent-ready.mjs
# agent-files.config.mjs's own imports ("./backend/tools.mjs") match the REAL
# repo layout (sites/ghost/backend/tools.mjs) — mirrored here too, alongside
# the flattened copies above other files already import.
COPY sites/ghost/backend/tools.mjs sites/ghost/backend/store.mjs ./backend/
COPY sites/ghost/agent-files.config.mjs ./agent-files.config.mjs
COPY sites/ghost/knowledge.json ./knowledge.json
ENV NODE_ENV=production
EXPOSE 8117
CMD ["node", "index.mjs"]
