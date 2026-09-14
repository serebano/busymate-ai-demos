# Build context is the REPO ROOT (see scripts/deploy.sh) so this can pull in
# the shared server module from sites/_shared/backend/. Copy the WHOLE
# directory (not individual files) — a shared module gaining a new sibling
# import must never silently break a demo whose Dockerfile still lists files
# one by one (this broke shopify live on 2026-09-11 — see its Dockerfile).
FROM node:20-alpine
WORKDIR /app
COPY sites/_shared/backend/ ./_shared/
# The action-card builder is imported as ../ui/ from _shared/, so it keeps
# that relative position in the image — this demo declares formCard on
# open_ticket/request_access/ticket_status.
COPY sites/_shared/ui/form-card.mjs ./ui/form-card.mjs
COPY sites/slack/backend/tool-schema.mjs ./tool-schema.mjs
COPY sites/slack/backend/index.mjs ./index.mjs
ENV NODE_ENV=production
EXPOSE 8105
CMD ["node", "index.mjs"]
