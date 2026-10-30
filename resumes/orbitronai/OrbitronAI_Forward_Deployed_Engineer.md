# Siddhant Rangari

**Forward Deployed Engineer · Multi-Agent Systems, LLM Platforms & Full Stack · 12+ Years · Bangalore, India**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com · github.com/siddhantrangari

## Professional Summary

Engineer who sits with the people who have the problem, works out the why, then builds the system hands-on. Over the last year co-founded and shipped three products from 0→1 working directly with co-founders and users, including a multi-tenant AI agent platform with multi-step agent workflows, an MCP tool layer into Gmail, Calendar, GitHub, Notion, Slack and Postgres, and multi-provider LLM failover. Builds agents for real operations, not demos: deterministic checks before any LLM step, evidence-gated outputs, human-in-the-loop approval and append-only audit trails. Before that, 12+ years shipping distributed backend and React systems, including real-time clinical platforms at Philips and GE Healthcare, and a 6-service AI SaaS designed with a founder from business requirements.

## Technical Skills

**Agentic AI:** Multi-agent systems, stateful agent workflows, tool-use loops, human-in-the-loop controls, MCP (Model Context Protocol), RAG pipelines, LLM routing & failover (DeepInfra, Groq, Together AI), open-weight models (Ollama / LLaMA 3), Google ADK, Vertex AI, LangChain, audit logging
**Full stack:** Python (FastAPI, data pipelines), TypeScript, Node.js (Fastify), React 18, Next.js, SSE streaming interfaces, Java (Spring Boot), REST APIs, JWT/OAuth2
**Integrations:** Gmail, Google Calendar, GitHub, Notion, Slack, Meta Marketing API, Twilio (Voice, WhatsApp), Razorpay, Whisper STT, ElevenLabs TTS
**Data & infra:** PostgreSQL, Redis, TimescaleDB, RabbitMQ, Kafka, GCP (Vertex AI, Cloud Run), AWS, Azure AKS, Docker, Kubernetes, GitHub Actions, ArgoCD, Prometheus, Grafana, OpenTelemetry

## 0→1 Products Built With Users | Jan 2026 – Sep 2026

### Forward Deployed Engineer (Co-Founder) — TradingOS
*Feb 2026 – Apr 2026 · Nagpur, India*
- Worked from traders' real workflow to decide what to build, then built it: a React 18 / TypeScript platform with a backtesting engine and an AI coach (LLaMA 3 via Ollama) that injects the user's live trading context and streams responses over SSE.
- Built a Python market-data pipeline into TimescaleDB; migrated 221K+ bars and 1.78M flow events with zero data loss.

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform
*Apr 2026 – Aug 2026 · Nagpur, India · myagentfirm.com*
- Turned marketers' day-to-day jobs into agent workflows and shipped them: Meta Ads campaign automation, auto-dubbing (Whisper → translate → TTS → ffmpeg), brand-kit generation (FLUX + LLM) and AI voice sales calls via Twilio.
- Built the integration glue: an MCP layer giving agents per-user access to Gmail, Google Calendar, GitHub, Notion, Slack and Postgres.
- Made it production-grade: LLM failover routing (DeepInfra → Groq → Together AI) for near-zero-downtime AI, 6 async workers and 8 cron loops on a Fastify (Node 22) backend with 24 API modules, and an atomic credit ledger (11 pricing tiers) that refunds automatically when an AI job fails.

### AI Engineer — AnnaRakshak AI (Google "Build with AI: Code for Communities" hackathon)
*Sep 2026 · github.com/siddhantrangari/annarakshak-ai*
- Built a multi-agent system for a real operational problem: a deterministic anomaly detector over public mandi prices (caught a real −42.1% tomato price crash) feeding three Vertex AI agents (Google ADK) that draft case summaries and farmer notices using read-only tools.
- Designed for trust: hypotheses confirmed only by verified evidence, human approval before anything goes out, drafts superseded when evidence changes, and an append-only audit log; detection-to-report time fell from 85–170 minutes to about one.

### Founding Engineer (Co-Founder) — ChalOnline, creator SaaS
*Jan 2026 – Feb 2026 · Nagpur, India*
- Took a creator platform from architecture to production in weeks and signed its first paying customer; found and fixed a production database exposure.

## Professional Experience

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Sat with the founder to turn business needs into an AI design-and-scheduling SaaS for SMBs, then designed, built and owned 6 Spring Boot services on Azure AKS and the React / Next.js frontend with Razorpay subscriptions.
- Set GitOps delivery (GitHub → CI → ArgoCD → AKS) with zero-downtime rollouts; built a notification pipeline with zero missed sends.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Built a real-time patient-monitoring pipeline (Kafka → Spring Boot → React) with sub-second latency; a Kafka → AWS S3 redesign cut dashboard load time by 70%.
- Led the Redshift → EMR-on-EKS migration, coordinating with other teams; rebuilt an Apache Camel integration as a Spring Boot microservice (98% more efficient APIs).
- Owned observability (Prometheus, Grafana, Loki, Tempo, OpenTelemetry), cutting MTTR by 30–40%; mentored 5+ developers, lifting team delivery by 20%.

### Earlier roles
- **Senior Software Engineer — GE Healthcare** · Sep 2020 – Jun 2021 · Bangalore, India — real-time device and EMR integrations where data accuracy is life-critical.
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — APIs integrating external data providers.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications on AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India.

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
