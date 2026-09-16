# Build context is the REPO ROOT (see scripts/deploy.sh) so this can pull in
# the shared server module from sites/_shared/backend/. Copy the WHOLE
# directory (not individual files) — a shared module gaining a new sibling
# import must never silently break this demo (see sites/shopify/backend/Dockerfile).
FROM node:20-alpine
WORKDIR /app
COPY sites/_shared/backend/ ./_shared/
COPY sites/_shared/ui/form-card.mjs ./ui/form-card.mjs
# busymate-devtools#3054: the shared agents.json merge — never a copy.
# gen-agent-files.mjs's own relative import ("./backend/tool-schema.mjs")
# is mirrored at ./backend/ alongside the flattened ./_shared/tool-schema.mjs
# the wholesale copy above already placed.
COPY sites/_shared/gen-agent-files.mjs ./gen-agent-files.mjs
COPY sites/_shared/backend/tool-schema.mjs ./backend/tool-schema.mjs
# busymate-devtools#3070: the shared homepage builder's own transitive
# module-level imports (loaded even though this demo calls only its
# landing-page exports) — agent-ready-static.mjs itself is already in the
# wholesale ./_shared/ copy above.
COPY sites/_shared/gen-protocol-files.mjs sites/_shared/gen-robots-sitemap.mjs sites/_shared/webmcp-catalog.mjs ./
COPY sites/bigcommerce/brand.json ./brand.json
COPY sites/bigcommerce/backend/index.mjs ./index.mjs
COPY sites/bigcommerce/backend/tools.mjs ./tools.mjs
COPY sites/bigcommerce/backend/bigcommerce.mjs ./bigcommerce.mjs
COPY sites/bigcommerce/backend/wellKnown.mjs ./wellKnown.mjs
ENV NODE_ENV=production
EXPOSE 8110
CMD ["node", "index.mjs"]
