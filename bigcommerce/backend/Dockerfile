# Build context is the REPO ROOT (see scripts/deploy.sh) so this can pull in
# the shared server module from sites/_shared/backend/. Copy the WHOLE
# directory (not individual files) — a shared module gaining a new sibling
# import must never silently break this demo (see sites/shopify/backend/Dockerfile).
FROM node:20-alpine
WORKDIR /app
COPY sites/_shared/backend/ ./_shared/
COPY sites/_shared/ui/form-card.mjs ./ui/form-card.mjs
COPY sites/bigcommerce/backend/index.mjs ./index.mjs
COPY sites/bigcommerce/backend/tools.mjs ./tools.mjs
COPY sites/bigcommerce/backend/bigcommerce.mjs ./bigcommerce.mjs
COPY sites/bigcommerce/backend/wellKnown.mjs ./wellKnown.mjs
ENV NODE_ENV=production
EXPOSE 8110
CMD ["node", "index.mjs"]
