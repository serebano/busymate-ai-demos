# Build context is the REPO ROOT so this can pull in the shared server modules.
#
#   docker build -f sites/woo/backend/Dockerfile -t demo-woo-backend .
#
# See sites/woo/provision.sh for the run line (it injects the store's REST key
# from <demo-host>/woo/data/.wc-api-key, which never enters this image).
FROM node:20-alpine
WORKDIR /app
COPY sites/_shared/backend/mcp-identity-server.mjs ./_shared/mcp-identity-server.mjs
COPY sites/_shared/backend/actor.mjs ./_shared/actor.mjs
# The action-card builder is imported as ../ui/ from _shared/, so it keeps that
# relative position in the image.
COPY sites/_shared/ui/form-card.mjs ./ui/form-card.mjs
COPY sites/woo/backend/index.mjs ./index.mjs
COPY sites/woo/backend/tools.mjs ./tools.mjs
COPY sites/woo/backend/routes.mjs ./routes.mjs
COPY sites/woo/backend/woo.mjs ./woo.mjs
ENV NODE_ENV=production
EXPOSE 8107
CMD ["node", "index.mjs"]
