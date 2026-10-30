# Siddhant Rangari

**Staff AI Engineer · Agentic Systems, Multi-Agent Orchestration & LLM Integration · 12+ Years · Bangalore, India**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com · github.com/siddhantrangari

## Professional Summary

Engineer who builds agents that act inside real systems, not wrappers around an LLM API. Over the last year co-founded and shipped a multi-tenant AI agent platform from 0→1: multi-step agent workflows, an MCP tool layer into Gmail, Calendar, GitHub, Notion, Slack and Postgres, and multi-provider LLM failover tuned for reliability, latency and cost. Sets the bar for trustworthy AI output: deterministic checks before any LLM step, evidence-gated conclusions to stop hallucinations, human-in-the-loop approval and append-only audit logs. Backed by 12+ years of production backend and full-stack engineering (Python, TypeScript, Java), including real-time clinical systems at Philips and GE Healthcare, with CI/CD, API design and observability as habits. Uses AI coding tools daily.

## Technical Skills

**Agentic AI:** Multi-agent orchestration, tool-using agents, multi-step workflows, human-in-the-loop controls, MCP (Model Context Protocol), RAG pipelines, Google ADK, Vertex AI, LangChain, prompt and context design
**LLMs:** LLM API integration, routing & failover (DeepInfra, Groq, Together AI), open-weight models (Ollama / LLaMA 3), Whisper STT, ElevenLabs TTS, FLUX image generation
**Engineering:** Python (FastAPI, data pipelines), TypeScript, Node.js (Fastify), Java (Spring Boot), React 18, REST APIs, async workers, job queues, RabbitMQ, Kafka, PostgreSQL, Redis, TimescaleDB
**Platform:** GCP (Vertex AI, Cloud Run), AWS, Azure AKS, Docker, Kubernetes, GitHub Actions, ArgoCD, Prometheus, Grafana, OpenTelemetry

## AI Agent Systems Built and Shipped | Jan 2026 – Sep 2026

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform
*Apr 2026 – Aug 2026 · Nagpur, India · myagentfirm.com*
- Owned the AI pipeline end to end, from agent design to deployment: a Fastify (Node 22) backend with 24 API modules, 6 async workers and 8 recurring cron loops running agent jobs for multiple tenants.
- Built tool-using agents that act in users' own systems through an MCP layer with per-user access to Gmail, Google Calendar, GitHub, Notion, Slack and Postgres.
- Shipped multi-step AI workflows chained across models: auto-dubbing (Whisper → translate → TTS → ffmpeg), brand-kit generation (FLUX + LLM), Meta Ads campaign automation and AI voice sales calls via Twilio.
- Engineered LLM failover routing (DeepInfra → Groq → Together AI) for near-zero-downtime AI features, balancing latency and cost; an atomic credit ledger refunds automatically when an AI job fails.

### AI Engineer — AnnaRakshak AI (Google "Build with AI: Code for Communities" hackathon)
*Sep 2026 · github.com/siddhantrangari/annarakshak-ai*
- Built a multi-agent system: a deterministic anomaly detector over public mandi prices (caught a real −42.1% tomato price crash) hands evidence to three Vertex AI agents (Google ADK) that draft case summaries and farmer notices using read-only tools.
- Set the reliability and safety bar: hypotheses confirmed only by verified evidence, human approval before anything goes out, drafts superseded when evidence changes, append-only audit log; detection-to-report time fell from 85–170 minutes to about one.

### Forward Deployed Engineer (Co-Founder) — TradingOS
*Feb 2026 – Apr 2026 · Nagpur, India*
- Built a context-aware AI coach on an open-weight model (LLaMA 3 via Ollama) that injects the user's live trading context and streams responses over SSE; built a Python market-data pipeline into TimescaleDB (221K+ bars, 1.78M flow events migrated with zero data loss).

### Founding Engineer (Co-Founder) — ChalOnline, creator SaaS
*Jan 2026 – Feb 2026 · Nagpur, India*
- Took a creator platform from architecture to production in weeks and signed its first paying customer.

## Professional Experience

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Worked with the founder to turn business needs into an AI design-and-scheduling SaaS: designed, built and owned 6 Spring Boot services on Azure AKS and a React / Next.js frontend, with GitOps delivery and zero-downtime rollouts.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Built a real-time patient-monitoring pipeline (Kafka → Spring Boot → React) with sub-second latency; a Kafka → AWS S3 redesign cut dashboard load time by 70%.
- Led the Redshift → EMR-on-EKS migration and S3 data lake architecture; rebuilt an Apache Camel integration as a Spring Boot microservice (98% more efficient APIs).
- Owned observability (Prometheus, Grafana, Loki, Tempo, OpenTelemetry), cutting MTTR by 30–40%; mentored 5+ developers, lifting team delivery by 20%.

### Earlier roles
- **Senior Software Engineer — GE Healthcare** · Sep 2020 – Jun 2021 · Bangalore, India — real-time device and EMR integrations where data accuracy is life-critical.
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — APIs integrating external data providers.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications on AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India.

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
