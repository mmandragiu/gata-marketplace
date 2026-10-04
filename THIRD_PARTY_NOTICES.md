# Third-party notices

Gata is released under the MIT License (see [LICENSE](LICENSE)). It includes or adapts the following
third-party work. Their licenses apply to those parts.

## Components copied into this repository

| Component | Source | License | Files |
| --- | --- | --- | --- |
| Marquee | [Watermelon UI](https://ui.watermelon.sh) | MIT, © Watermelon Platform Contributors | `src/components/third-party/marquee.tsx` |
| Continuous Tabs (adapted) | [Watermelon UI](https://ui.watermelon.sh) | MIT, © Watermelon Platform Contributors | `src/components/third-party/continuous-tabs.tsx` |
| Shimmer Button (adapted) | [Watermelon UI](https://ui.watermelon.sh) | MIT, © Watermelon Platform Contributors | `src/components/third-party/shimmer-button.tsx` |
| Text Morph (adapted) | [Componentry](https://github.com/harshjdhv/componentry) | MIT, © Harsh Jadhav | `src/components/third-party/text-morph.tsx` |
| UI primitives (generated) | [shadcn/ui](https://github.com/shadcn-ui/ui) | MIT, © shadcn | `src/components/ui/*` |

Each adapted file keeps a header with its origin, license and the changes made.

## Main dependencies (installed from npm, not vendored)

| Package | License |
| --- | --- |
| next, react, react-dom | MIT |
| radix-ui, shadcn, cn, sonner, next-themes, motion, clsx, tailwind-merge, tw-animate-css, tailwindcss | MIT |
| class-variance-authority | Apache-2.0 |
| lucide-react | ISC |
| @supabase/supabase-js, @supabase/ssr | MIT |
| @electric-sql/pglite, @electric-sql/pglite-pgvector | Apache-2.0 (bundle PostgreSQL and pgvector, both under the PostgreSQL License) |
| postgres (postgres.js) | Unlicense |
| openai | Apache-2.0 |
| zod | MIT |
| @modelcontextprotocol/sdk | MIT |
| typescript | Apache-2.0 |
| tsx, eslint, eslint-config-next | MIT |

The full license texts ship with each package in `node_modules/<package>/LICENSE`.
