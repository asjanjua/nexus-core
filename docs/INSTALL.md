# Install NexusAI Mission Control

## Quick Start

Clone the repository and install dependencies:

```bash
git clone https://github.com/asjanjua/nexus-core.git
cd nexus-core/apps/mission-control
npm install
```

Copy the environment template and fill in your keys:

```bash
cp .env.example .env.local
```

Required environment variables:

```
ANTHROPIC_API_KEY          Claude LLM provider
OPENAI_API_KEY             Embeddings (text-embedding-3-small)
DATABASE_URL               Neon Postgres connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXUS_VECTOR_SEARCH        Set to "enabled" to activate pgvector
```

Run migrations then start:

```bash
npm run db:migrate
npm run dev
```

Verify at: `http://localhost:3000/api/health`

## Production Deploy

NexusAI is deployed on Vercel with Neon Postgres and Cloudflare R2.

```bash
# From nexus-core root
bash deploy-company-context.sh
```

After deploy, confirm:

```bash
curl https://your-domain/api/health
```

## Requirements

- Node.js 20+
- PostgreSQL 15+ with pgvector extension (Neon recommended)
- Clerk account for authentication
- Anthropic API key for LLM synthesis
- OpenAI API key for embeddings (optional but recommended)

## Troubleshooting

- `db:migrate` fails: check `DATABASE_URL` is set and the DB is reachable.
- `api/health` returns unhealthy: check that at least one of `ANTHROPIC_API_KEY`
  or `NEXUS_LLM_PROVIDER` is configured.
- Evidence not processing: verify `NEXUS_VECTOR_SEARCH` is `enabled` and
  migration 0007 has run (adds the pgvector HNSW index).
