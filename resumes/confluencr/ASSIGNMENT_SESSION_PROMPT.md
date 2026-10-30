# New session prompt — Confluencr take-home: Transaction Ledger API

Paste everything below the line into a fresh Claude Code session started in a NEW, empty folder
(suggested: `~/DEV-ENV/confluencr-ledger-api`). It is self-contained.

---

## Who I am and why this matters

I'm Siddhant Rangari, a Bangalore-based full-stack engineer with 12+ years (Java/Spring Boot, Node.js/Fastify, React, PostgreSQL, Kafka/RabbitMQ, Docker/Kubernetes, AWS/Azure/GCP). In the last year I co-founded and shipped three products from 0→1, including **MyAgentFirm**, a multi-tenant AI agent platform where I built an **atomic credit ledger across 11 pricing tiers with automatic compensating refunds, a full audit trail and zero double-spend**, and a job queue on PostgreSQL (`FOR UPDATE SKIP LOCKED`). Earlier: Philips Innovation Campus (real-time Kafka → Spring Boot → React pipelines) and GE Healthcare.

**Confluencr** (Walnut Folks Group: Confluencr, Intent Farm, Kalakaaar) shortlisted my resume for **Senior Full Stack Developer – Generative AI** (Bangalore). Round 1 is this take-home. **It is due today, 29 Oct 2026.** Round 2 is a technical group interview where I will have to defend my choices, Round 3 is with the hiring manager.

Submission is a Google Form: https://forms.gle/zgfJfZ2cfqKKWGFw9 — they want **source code, README, API documentation, assumptions**.

## How I want to work in this session — in this order. Do not skip ahead.

### Phase 1 — Understand before building (no code yet)
1. Restate the assignment in your own words: what they are really testing, beyond the literal endpoints. My read: this is a correctness test disguised as CRUD — idempotency, atomicity, concurrency, immutability, database constraints, consistent errors. Confirm or challenge that.
2. List every explicit requirement from the brief below as a numbered checklist (I'll use it as the acceptance test list), and separately list the **ambiguities** where I must make an assumption (for example: amount precision and storage type, ID format, what "appropriate response" for a duplicate means — 200 with the original vs 409, max page size, whether a failed debit is recorded anywhere, transfer reference_id semantics, concurrency of two debits at once, timezone of created_at).
3. Map the assignment to the JD (summary below) and to my resume: which JD signals this lets me show, and which it does not. Note the seniority gap (JD says 2–4 years; I have 12+) and how the submission should read as senior without over-engineering a 3–4 hour task.
4. Give me a short recommendation on stack and scope, with trade-offs, then **stop and wait for my OK**.

My default unless you convince me otherwise: **Node.js 22 + TypeScript + Fastify + PostgreSQL** (docker compose for Postgres), plain SQL or a thin query layer (no heavy ORM magic hiding transactions), zod or Fastify JSON-schema validation, Vitest/Jest + supertest for tests, OpenAPI docs. It's the stack I know best and the one I can defend line by line in the group interview.

### Phase 2 — Plan
Schema (with every constraint and why), endpoint list with request/response/error shapes, the transaction and locking strategy, error format, test plan mapped to the checklist, and a time budget that fits 3–4 hours including docs. Wait for my OK.

### Phase 3 — Build, test-first where it matters
Build in small commits. Tests must prove every rule in the brief, including:
- duplicate reference_id for the same account → no new row, balance unchanged; same reference_id on a different account → allowed
- debit with insufficient balance → rejected, balance unchanged
- balance always equals the sum of valid transactions (a consistency test, e.g. 100 + 50 − 30 − 20 = 100)
- **concurrency**: many parallel debits/credits on one account never overdraw or lose an update; parallel duplicate submissions create exactly one transaction
- atomicity: a failure mid-operation persists nothing
- transactions cannot be updated or deleted through the API (no such routes; optionally a DB trigger that rejects UPDATE/DELETE on the transactions table)
- pagination metadata, latest-first ordering, type filter, invalid page/limit
- bonus transfer: both legs in one DB transaction, deterministic lock ordering to avoid deadlocks, no partial transfer, self-transfer rejected

### Phase 4 — Docs and submission pack
- README: run locally in a few commands (docker compose up + migrate + start), run tests, design overview.
- API documentation: OpenAPI spec + a readable endpoint table with example requests/responses and every error code.
- ASSUMPTIONS.md: each ambiguity and the decision taken.
- DECISIONS.md (short): money type, locking, idempotency, immutability, why not an ORM — written so I can talk through it in the group interview.
- A 5-line summary I can paste into the Google Form.
- Ask me before creating a GitHub repo or pushing anything public.

## Rules for this session
- This is my own work submission: keep the code something I fully understand and can explain; no clever code I couldn't defend. Comment the non-obvious parts (locking, idempotency) briefly.
- Don't add AI/LLM features to this API — the brief doesn't ask for it, and adding it would read as not following requirements. (The GenAI side of the JD is for the interviews.)
- Keep scope to the brief + the bonus transfer + tests + docs. Mention further ideas (auth, rate limiting, an outbox/event stream, double-entry ledger) only in DECISIONS.md as "next steps".
- Never put anything about my personal finances in any file.

## The assignment brief (transcribed in full)

**Full Stack Developer Assessment — Assignment: Transaction Ledger API. Duration: 3–4 hours.**

**Objective:** Build a backend API for a simple transaction ledger system. Users can create accounts, perform credit and debit transactions, and retrieve account balances and transaction history.

**1. Create Account** — fields: `id` (unique account identifier), `name` (account holder name), `balance` (current balance), `created_at` (creation timestamp).
Requirements: id must be unique; name is required; initial balance must always be 0; created_at generated by the system; the client must not be allowed to set the initial balance.

**2. Add Transaction** — fields: `id` (unique transaction id), `account_id`, `type` (credit | debit), `amount`, `description`, `reference_id` (unique reference for the transaction within an account), `created_at`.
- Credit increases the balance by the amount (100 + 50 → 150).
- Debit decreases the balance by the amount (100 − 30 → 70).
- A debit must be rejected if the account has insufficient balance (balance 100, debit 150 → rejected, balance remains 100).
- **Duplicate transactions:** for the same account, reference_id must be unique. If a transaction with the same reference_id is submitted again for the same account: a new transaction must not be created; the balance must not change; the API should return an appropriate response indicating the transaction already exists. The same reference_id may be used for different accounts.

**3. Get Account Balance** — response includes at least `account_id` and `balance`. If the account does not exist, return an appropriate error.

**4. Get Transaction History** — all transactions for an account.
- Filtering by type: credit, debit; if no type is provided, return both.
- Pagination with `page` and `limit`; response tells the client current page, page size, total records, total pages.
- Sorting: latest-first by created_at.

**5. Data Integrity** — consistency at all times.
- Transaction immutability: once created, a transaction must not be editable or deletable through the API; type, amount, description, reference ID, account ID and creation timestamp must remain unchanged.
- Balance consistency: the balance must always represent the result of all valid transactions (0 → +100 → +50 → −30 → −20 = 100). A failed or rejected transaction must not affect the balance.
- Atomicity: creating a transaction and updating the balance is one atomic operation; if either fails, neither is persisted.

**7. Validations** (numbering as in their doc) — at minimum: account name provided; account ID must exist when creating a transaction; type must be credit or debit; amount > 0; reference_id provided; duplicate reference_id for the same account handled correctly; debits need sufficient balance; invalid account IDs return an appropriate error; invalid request data returns an appropriate validation error.

**8. Error Handling** — proper HTTP status codes and meaningful, consistent, understandable error responses. Cases: account not found, invalid transaction type, invalid amount, insufficient balance, duplicate transaction, invalid pagination parameters, invalid request body.

**9. Bonus: Money Transfer** — transfer from one account to another (A 100, B 50; transfer 30 A→B; A 70, B 80). Requirements: source must have sufficient balance; both accounts must exist; the debit from source and credit to destination happen atomically; if any part fails, the entire transfer is rolled back; a partial transfer must never be possible.

**10. Technical Requirements** — any backend technology/framework; any relational or non-relational database; clean, maintainable project structure; proper validation; proper error handling; **use database constraints where appropriate to maintain data integrity**; runnable locally using the README instructions.

**11. Submission** — 1. Source code 2. README 3. API documentation 4. Assumptions.

## The JD (summary) — Senior Full Stack Developer – Generative AI, Confluencr, Bangalore

- Posted 10/12/2026; the listing says 1–3 years / 2–4 years experience; full time; Bangalore South (560102).
- Company: Confluencr — influencer marketing, 100+ people, 700+ brands, campaigns in 15+ countries, Great Place To Work certified; in-house systems shortlist creators, track performance at scale and optimise campaigns in real time. Part of Walnut Folks Group (Confluencr, Intent Farm — performance & marketplace marketing, Kalakaaar — talent representation).
- Role: take problems from idea to production; work directly with founders, business, marketing, ops, finance; across their SaaS products, Creator App and internal AI-powered systems; own it after launch.
- What they do: own products end to end (requirements → technical plan → MVP → ship → monitor → improve); build AI features (LLMs, structured outputs, tool calling, RAG, agentic workflows; evaluate models/prompts for quality, latency, reliability, cost; validation, error handling, observability and human review for AI outputs); scalable full-stack apps (APIs, data models, schemas, maintainable testable code, third-party integrations, auth, background jobs, performance and production issues); ship, measure, improve (prototype fast, deploy and monitor, use AI coding tools without losing quality, document decisions).
- Essential: shipping full-stack apps; strong fundamentals; practical LLM integration; REST APIs, databases, third-party integrations; production deployment and troubleshooting; breaking down ambiguous requirements; ownership.
- Especially wanted: beyond basic chatbots — structured outputs, RAG/semantic search/document processing, agents and tool calling, evaluating AI quality and handling hallucinations; AI coding assistants; consumer/SaaS products with users; cloud, CI/CD, automated tests, monitoring; background processing, queues, caching, event-driven systems; martech, creator platforms, analytics, workflow automation; a portfolio/GitHub/live product.
- How they work: explain trade-offs to non-technical people; decide with incomplete requirements; know when AI vs plain software vs simpler is right; move fast and keep quality; own post-deploy.
- Success: business problems → working solutions; useful prototypes and production features; AI that measurably improves accuracy/productivity/UX; reliable apps via testing and monitoring.

## My resume points relevant to this assignment and JD (only these facts — don't invent more)

- **MyAgentFirm** (co-founder, Apr–Aug 2026, myagentfirm.com): multi-tenant AI agent platform for marketers; Fastify (Node 22) backend, 24 API modules, JWT auth, React frontend, 6 async workers, 8 cron loops; Meta Ads campaign automation, AI video with multi-provider fallback, auto-dubbing (Whisper → translate → TTS → ffmpeg), brand-kit generation (FLUX + LLM), AI voice sales calls via Twilio; MCP tool layer (Gmail, Calendar, GitHub, Notion, Slack, Postgres); LLM failover routing (DeepInfra → Groq → Together AI); job queue on PostgreSQL (FOR UPDATE SKIP LOCKED) then RabbitMQ; **atomic credit ledger, 11 pricing tiers, automatic refunds when an AI job fails, audit trail, zero double-spend**.
- **AnnaRakshak AI** (Google Build with AI hackathon, Sep 2026): deterministic anomaly detector + three Vertex AI agents (Google ADK), read-only tools, evidence-gated conclusions, human approval, append-only audit log.
- **TradingOS** (co-founder, Feb–Apr 2026): React 18/TypeScript trading platform, backtesting engine, AI coach (LLaMA 3 via Ollama) over SSE; Python market-data pipeline into TimescaleDB, 221K+ bars and 1.78M flow events migrated with zero data loss.
- **ChalOnline** (co-founder, Jan–Feb 2026): creator & education SaaS, PostgreSQL, Redis, Razorpay; first paying customer; fixed a production DB exposure.
- **Growlogic / Eeko.ai** (freelance solutions architect, 2024–2025): 6 Spring Boot services on Azure AKS, React/Next.js, Razorpay subscriptions, Spring Batch notifications with zero missed sends, GitOps zero-downtime rollouts.
- **Philips** (2021–2024): Kafka → Spring Boot → React real-time monitoring, sub-second latency; Kafka → S3 redesign, 70% faster dashboards; 98% more efficient APIs; observability, 30–40% lower MTTR; mentored 5+ developers.

The resume I sent them is titled "Senior Full-Stack & Generative AI Engineer · 12+ Years · Bangalore" and leads with those products.

## First reply I expect from you
Phase 1 only: the restatement, the numbered requirement checklist, the ambiguity list with your proposed default for each, the JD/resume alignment (including the seniority point and what the group interview will likely probe), and your stack/scope recommendation with a time plan. Then wait.
