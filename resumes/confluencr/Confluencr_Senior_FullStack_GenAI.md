# Siddhant Rangari

**Senior Full-Stack & Generative AI Engineer · 12+ Years · Bangalore, India**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com · github.com/siddhantrangari

## Professional Summary

Full-stack engineer who takes products from idea to production and owns them after launch. Over the last year, built and shipped three SaaS products from 0→1 working directly with co-founders: a multi-tenant AI agent platform with Meta Ads automation, AI video, auto-dubbing and brand-kit generation for marketers; a creator and education SaaS with a paying customer; and a trading platform with an AI coach. Practical generative AI beyond chatbots: agentic workflows with tool calling through MCP, RAG, multi-provider LLM failover to balance cost, latency and reliability, and human review with audit logs for AI outputs. Backed by 12+ years of reliable backend and React work, including real-time clinical systems at Philips and GE Healthcare: 70% faster dashboards, 98% more efficient APIs, 30–40% lower MTTR.

## Technical Skills

**Generative AI:** LLM APIs, tool calling and agentic workflows, MCP (Model Context Protocol), RAG pipelines, multi-agent systems, Google ADK, Vertex AI, LangChain, LLM routing & failover (DeepInfra, Groq, Together AI, Ollama/LLaMA 3), Whisper STT, ElevenLabs TTS, FLUX image generation
**Full stack:** React 18, Next.js, TypeScript, Redux Toolkit, Node.js (Fastify, Express), Python (FastAPI), Java (Spring Boot), REST APIs, JWT/OAuth2
**Data & background work:** PostgreSQL (job queues, transactional ledgers, 23 migrations), Redis, Firestore, TimescaleDB, RabbitMQ, Kafka, async workers, cron jobs
**Integrations:** Meta Marketing API, Twilio (Voice, WhatsApp), WhatsApp Business API, Razorpay, Firebase Auth, Cloudflare R2
**Ship & operate:** Docker, Kubernetes, CI/CD (GitHub Actions, ArgoCD), Nginx, Google Cloud Run, Prometheus, Grafana, OpenTelemetry; Jest, React Testing Library, Playwright, JUnit; AI coding assistants daily

## Products Built and Shipped | Jan 2026 – Sep 2026

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform for marketers
*Apr 2026 – Aug 2026 · Nagpur, India · myagentfirm.com*
- Built the product end to end from 0→1: a Fastify (Node 22) backend with 24 API modules and JWT auth, React frontend, 6 async background workers and, separately, 8 recurring cron loops.
- Shipped marketing AI workflows: Meta Ads campaign automation, AI video generation with a multi-provider fallback chain, auto-dubbing (Whisper → translate → TTS → ffmpeg), brand-kit generation (FLUX + LLM) and AI voice sales calls via Twilio.
- Built agentic tool calling through an MCP layer with per-user access to Gmail, Google Calendar, GitHub, Notion, Slack and Postgres.
- Engineered LLM failover routing (DeepInfra → Groq → Together AI) to keep AI features near-zero-downtime while balancing cost and latency.
- Ran the job queue on PostgreSQL (FOR UPDATE SKIP LOCKED, no broker) first, then replaced it with RabbitMQ in the second update; built an atomic credit ledger (11 pricing tiers) that refunds automatically when an AI job fails.

### AI Engineer — AnnaRakshak AI (Google "Build with AI: Code for Communities" hackathon)
*Sep 2026 · github.com/siddhantrangari/annarakshak-ai*
- Built a multi-step AI workflow: a deterministic anomaly detector over public mandi prices that caught a real −42.1% tomato price crash, then three Vertex AI agents (Google ADK) that draft case summaries and farmer notices with read-only tools.
- Handled AI failure modes by design: to stop hallucinated conclusions, hypotheses are confirmed only by verified evidence, with human approval before anything goes out, drafts superseded when evidence changes, and an append-only audit log; cut detection-to-report time from 85–170 minutes to about one.

### Forward Deployed Engineer (Co-Founder) — TradingOS
*Feb 2026 – Apr 2026 · Nagpur, India*
- Built a React 18 / TypeScript trading platform with a backtesting engine and an AI coaching module (LLaMA 3 via Ollama) that injects the user's live trading context and streams responses over SSE.
- Built a Python market-data pipeline into TimescaleDB; migrated 221K+ bars and 1.78M flow events with zero data loss.

### Founding Engineer (Co-Founder) — ChalOnline, creator & education SaaS
*Jan 2026 – Feb 2026 · Nagpur, India*
- Took a creator platform for coaches and workshop hosts (funnels, webinars, community products) from architecture to production in weeks, with PostgreSQL, Redis and Razorpay, and signed its first paying customer.
- Found and fixed a production security exposure (Postgres and Redis open to the public internet).

## Professional Experience

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Worked closely with the founder to turn business needs into an AI social-media design and scheduling SaaS for SMBs: 6 Spring Boot services on Azure AKS and a React / Next.js frontend with Razorpay subscriptions.
- Built a Spring Batch WhatsApp notification pipeline with timezone-aware scheduling and zero missed sends; GitOps delivery for zero-downtime rollouts.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Built a real-time patient-monitoring dashboard (Kafka → Spring Boot → React) with sub-second latency; a Kafka → AWS S3 redesign cut load time by 70%.
- Rebuilt an Apache Camel integration as a Spring Boot microservice (98% more efficient APIs); observability work cut MTTR by 30–40%.
- Mentored 5+ junior developers, lifting team delivery by 20%.

### Earlier roles
- **Senior Software Engineer — GE Healthcare** · Sep 2020 – Jun 2021 · Bangalore, India — device and EMR integrations feeding React clinical dashboards.
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — Spring Boot APIs and React interfaces.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications on AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India.

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
