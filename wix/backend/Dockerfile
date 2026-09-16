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
# busymate-devtools#3070: the shared homepage builder (lang/canonical/JSON-LD/
# contact + Markdown negotiation) + its transitive deps (its own module-level
# imports, loaded even though this demo calls only its landing-page exports).
COPY sites/_shared/backend/agent-ready-static.mjs ./_shared/agent-ready-static.mjs
COPY sites/_shared/gen-protocol-files.mjs sites/_shared/gen-robots-sitemap.mjs sites/_shared/webmcp-catalog.mjs ./
COPY sites/wix/brand.json ./brand.json
COPY sites/wix/backend/index.mjs ./index.mjs
COPY sites/wix/backend/tools.mjs ./tools.mjs
COPY sites/wix/backend/store.mjs ./store.mjs
COPY sites/wix/backend/wixContent.mjs ./wixContent.mjs
COPY sites/wix/backend/wellKnown.mjs ./wellKnown.mjs
ENV NODE_ENV=production
EXPOSE 8119
CMD ["node", "index.mjs"]
