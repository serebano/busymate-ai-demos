---
title: "Glossary — Nomad Circuits"
description: "What this site's agent-discovery terms mean."
last_updated: 2026-09-14
---

# Glossary

Source: https://telegram.demo.busymate.ai/glossary

### MCP (Model Context Protocol)

The open protocol an AI assistant uses to call a site's own tools and read its own data over a standard JSON-RPC interface, instead of scraping HTML. This site's MCP server answers at `/mcp`; its card is at `/.well-known/mcp.json`.

### WebMCP

The in-page twin of MCP: the page itself registers tools on `document.modelContext`, so a browser-based agent can act on exactly what a visitor sees, without leaving the page. See `/webmcp-catalog.json`.

### llms.txt

A short, curated Markdown index of a site's key pages and what an assistant can do with it — the first file an agent should read. See `/llms.txt`.

### agents.json

This site's bespoke discovery card (name, description, MCP/WebMCP endpoints, tools, identity, human hand-off) — see `/agents.json`. The DIFFERENT `/.well-known/agents.json` document below follows a separate community schema.

### agents.json (v0.1.0 tool-actions schema)

A community schema (agentsjson.org) describing a site's callable operations as "flows" over an OpenAPI source, referenced by `operationId`. Served at `/.well-known/agents.json` — a different document from the bare `/agents.json` card above.

### AGENTS.md

The agents.md convention's free-form contextual guide for a coding/AI agent working with this project — what it is, how to read it, what it may do. See `/AGENTS.md`.

### OpenAPI

A machine-readable, industry-standard description of an HTTP API's operations and schemas. See `/openapi.json`.

### A2A (Agent-to-Agent protocol)

A protocol for one AI agent to discover and call another agent as a peer, via an Agent Card. This demo does not implement A2A: `/.well-known/agent-card.json` answers an honest 404 rather than a fabricated card.

### MCP Server Card

A small, standard document describing an MCP server's identity and how to reach it (never its live tool list, which stays behind the protocol itself). See `/.well-known/mcp.json`.

### Content negotiation

Asking the SAME URL for a different representation via the `Accept` header — `Accept: text/markdown` on any page here returns its Markdown twin at the same address, no redirect.

### Structured data (JSON-LD)

Machine-readable facts embedded in a page's own HTML (`<script type="application/ld+json">`) describing what the page IS, so a reader never has to guess from prose.

## Sitemap

Every page on this site: [sitemap.md](https://telegram.demo.busymate.ai/sitemap.md)
