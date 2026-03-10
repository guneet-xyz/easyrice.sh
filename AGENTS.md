# Agent Instructions

## Repository Structure

This is an npm workspaces monorepo.

```
├── apps/
│   └── website/          # Next.js app (Cloudflare Workers via OpenNext)
├── compose.yml           # Docker Compose for local dev services
├── prettier.config.ts    # Shared Prettier config (root-level)
├── AGENTS.md
└── README.md
```

## Formatting

Prettier is configured at the root level and applies to all apps and packages.

```bash
npm run format:write                 # Format all files with Prettier
npm run format:check                 # Check formatting
```

## App-Specific Instructions

- [`apps/website/AGENTS.md`](apps/website/AGENTS.md) — Next.js website (build, lint, code style, architecture)
