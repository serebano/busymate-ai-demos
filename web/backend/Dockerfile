# Build context is the REPO ROOT (see scripts/deploy.sh) so this can pull in
# the shared server modules from sites/_shared/backend/.
FROM node:20-alpine
WORKDIR /app
COPY sites/_shared/backend/mcp-identity-server.mjs ./_shared/mcp-identity-server.mjs
COPY sites/_shared/backend/tool-schema.mjs ./_shared/tool-schema.mjs
COPY sites/_shared/backend/actor.mjs ./_shared/actor.mjs
# The action-card builder is imported as ../ui/ from _shared/, so it keeps that
# relative position in the image.
COPY sites/_shared/ui/form-card.mjs ./ui/form-card.mjs
COPY sites/web/backend/index.mjs ./index.mjs
COPY sites/web/backend/tools.mjs ./tools.mjs
COPY sites/web/backend/routes.mjs ./routes.mjs
COPY sites/web/backend/store.mjs ./store.mjs
COPY sites/web/backend/data ./data
ENV NODE_ENV=production
EXPOSE 8781
CMD ["node", "index.mjs"]
