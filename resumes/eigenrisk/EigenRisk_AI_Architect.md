# Siddhant Rangari

**Senior AI Engineer & Solutions Architect · Agentic Systems, MCP & LLM Platforms · 12+ Years · Bangalore, India**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com · github.com/siddhantrangari

## Professional Summary

Hands-on architect who sets the design and writes the code that proves it. Over the last year, owned the AI architecture of a multi-tenant agent platform end to end: multi-agent workflows, an MCP tool layer with per-user access controls, multi-provider LLM routing and failover tuned for cost, latency and reliability, and atomic usage metering. Designs AI systems for production rigour, not demos: deterministic checks before any LLM step, evidence-gated agent outputs to stop hallucinated conclusions, human-in-the-loop approval and append-only audit logs. Backed by 12+ years of distributed, cloud-native backend work on AWS, Azure and GCP, including real-time clinical systems at Philips and GE Healthcare (70% faster dashboards, 98% more efficient APIs, 30–40% lower MTTR), and by mentoring engineers into consistent delivery.

## Technical Skills

**AI architecture:** Agentic and multi-agent systems, MCP (Model Context Protocol) tool ecosystems, tool and function calling, RAG pipelines, LLM routing & failover (DeepInfra, Groq, Together AI), hosted and open-weight models (Ollama / LLaMA 3), Google ADK, Vertex AI, LangChain, human-in-the-loop controls, audit logging
**Backend & distributed systems:** Python (FastAPI, data pipelines), Node.js (Fastify), TypeScript, Java (Spring Boot, Spring Batch), REST and event-driven APIs, async workers, job queues, RabbitMQ, Kafka, JWT/OAuth2
**Data:** PostgreSQL (job queues, transactional ledgers, 23 migrations), Redis, TimescaleDB, AWS S3 data lake, EMR
**Cloud & operations:** AWS (S3, EMR, EKS, CloudWatch), Azure (AKS), GCP (Vertex AI, Cloud Run), Docker, Kubernetes, ArgoCD GitOps, GitHub Actions, Prometheus, Grafana, Loki, Tempo, OpenTelemetry
**Leadership:** Architecture ownership from 0→1, build-vs-buy and provider selection, technical documentation, code review standards, mentoring

## AI Platforms Architected and Shipped | Jan 2026 – Sep 2026

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform
*Apr 2026 – Aug 2026 · Nagpur, India · myagentfirm.com*
- Owned the end-to-end AI architecture from 0→1: a Fastify (Node 22) backend with 24 API modules and JWT auth, 6 async background workers and, separately, 8 recurring cron loops serving multiple tenants.
- Designed an MCP integration layer giving agents per-user access to Gmail, Google Calendar, GitHub, Notion, Slack and Postgres.
- Built multi-provider LLM failover routing (DeepInfra → Groq → Together AI) to keep AI features near-zero-downtime while balancing quality, cost and latency; applied the same fallback-chain pattern to AI video generation.
- Orchestrated multi-step AI workflows: auto-dubbing (Whisper → translate → TTS → ffmpeg), brand-kit generation (FLUX + LLM), Meta Ads campaign automation and AI voice calls via Twilio.
- Made AI usage safe to bill: an atomic credit ledger across 11 pricing tiers with automatic compensating refunds when an AI job fails, a full audit trail and zero double-spend; evolved the job queue from PostgreSQL (FOR UPDATE SKIP LOCKED) to RabbitMQ as load grew.

### AI Engineer — AnnaRakshak AI (Google "Build with AI: Code for Communities" hackathon)
*Sep 2026 · github.com/siddhantrangari/annarakshak-ai*
- Architected a multi-agent system: a deterministic anomaly detector over public mandi prices (caught a real −42.1% tomato price crash) feeding three Vertex AI agents (Google ADK) that draft case summaries and farmer notices using read-only tools.
- Designed for non-deterministic failure modes: hypotheses are confirmed only by verified evidence, a human approves before anything goes out, drafts are superseded when evidence changes, and every step lands in an append-only audit log; cut detection-to-report time from 85–170 minutes to about one.

### Forward Deployed Engineer (Co-Founder) — TradingOS, fintech platform
*Feb 2026 – Apr 2026 · Nagpur, India*
- Built an AI coaching module on an open-weight model (LLaMA 3 via Ollama) that injects the user's live trading context and streams responses over SSE, alongside a React 18 / TypeScript backtesting platform.
- Built a Python market-data pipeline into TimescaleDB; migrated 221K+ bars and 1.78M flow events with zero data loss.

### Founding Engineer (Co-Founder) — ChalOnline, creator SaaS
*Jan 2026 – Feb 2026 · Nagpur, India*
- Took a creator platform from architecture to production in weeks with PostgreSQL, Redis and Razorpay; found and fixed a production security exposure (Postgres and Redis open to the public internet).

## Professional Experience

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Worked with the founder to turn business goals into the architecture of an AI design-and-scheduling SaaS, then designed, built and owned 6 Spring Boot services on Azure AKS with a React / Next.js frontend.
- Set the delivery standard for every service: GitOps (GitHub → CI → ArgoCD → AKS) with zero-downtime rollouts; built a Spring Batch notification pipeline with zero missed sends.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Led the Redshift → EMR-on-EKS migration and S3 data lake architecture, coordinating across teams.
- Built a real-time patient-monitoring pipeline (Kafka → Spring Boot → React) with sub-second latency; a Kafka → AWS S3 redesign cut dashboard load time by 70%.
- Rebuilt an Apache Camel integration as a Spring Boot microservice (98% more efficient APIs); owned observability (Prometheus, Grafana, Loki, Tempo, OpenTelemetry), cutting MTTR by 30–40%.
- Mentored 5+ developers through code reviews, coding standards and design-pattern sessions, lifting team delivery by 20%.

### Earlier roles
- **Senior Software Engineer — GE Healthcare** · Sep 2020 – Jun 2021 · Bangalore, India — real-time device and EMR integrations where data accuracy is life-critical.
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — microservices integrating external data providers.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications on AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India.

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
