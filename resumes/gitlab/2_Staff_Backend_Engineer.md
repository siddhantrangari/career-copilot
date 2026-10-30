# Siddhant Rangari

**Backend Architect & AI Platform Engineer · 12+ Years · Bangalore, India**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com

## Professional Summary

Backend architect with 12+ years modernizing and operating production systems: an Apache Camel integration rebuilt as a Spring Boot microservice at Philips (98% more efficient APIs), a Redshift → EMR-on-EKS data platform migration, and a 6-service Azure AKS platform designed and owned end to end at Growlogic. Sets the operational standards others build on, including observability that cut MTTR by 30–40%, GitOps zero-downtime delivery and backend practices that lifted team delivery by 20% while mentoring 5+ developers. Runs agentic AI in production with guardrails: MCP tool use, LLM failover, human-in-the-loop approvals and append-only audit logs. Writes clearly and works well asynchronously and remotely.

## Technical Skills

**Architecture:** Modular service boundaries, monolith and legacy modernization, event-driven design, API contracts, data ownership, failure isolation
**Backend:** Java, Spring Boot, Spring Cloud, Spring Batch, Node.js (Fastify), TypeScript, Python (FastAPI)
**Data & messaging:** PostgreSQL (queues, transactional ledgers, schema migrations), MySQL, Redis, TimescaleDB, Kafka, RabbitMQ
**Platform & operations:** Kubernetes (EKS, AKS), Docker, ArgoCD GitOps, GitHub Actions, Prometheus, Grafana, Loki, Tempo, OpenTelemetry, CloudWatch
**Agentic AI:** Multi-agent systems, MCP tool use, LLM routing & failover, RAG, Google ADK, Vertex AI, review and audit guardrails

## Professional Experience

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Owned the architecture of an AI design-and-scheduling SaaS: split it into 6 Spring Boot services on Azure AKS (masterdata, design-processing, design-rendering, event-processing, subscription, notification), each with one clear responsibility.
- Defined the delivery standard for every service, GitOps via GitHub → CI → ArgoCD → AKS, giving zero-downtime rollouts.
- Worked closely with the founder to turn business needs into the platform design, and built a Spring Batch WhatsApp pipeline with zero missed sends.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Modernized a resource-heavy Apache Camel integration into a Spring Boot microservice with clean REST contracts, error handling and monitoring, improving API efficiency by 98%.
- Led the Redshift → EMR-on-EKS migration and S3 data lake architecture for clinical data workloads.
- Decoupled real-time streaming from rendering with a Kafka → AWS S3 pipeline, cutting dashboard load time by 70% while keeping sub-second vitals latency; worked with both Kafka and RabbitMQ.
- Established the observability standard (Prometheus, Grafana, Loki, Tempo, OpenTelemetry, CloudWatch), reducing MTTR by 30–40%.
- Mentored 5+ junior developers through coding standards, weekly code reviews and microservices design patterns, lifting team delivery by 20%.

### Senior Software Engineer — GE Healthcare
*Sep 2020 – Jun 2021 · Bangalore, India*
- Integrated patient-monitoring hardware, EMR systems and Spring Boot services for real-time maternal-fetal vitals, handling protocol transformation and error recovery in a life-critical domain.

### Earlier roles
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — Spring Boot microservices and REST APIs.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications on AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India — Java EE web applications.

## Independent Engineering Projects | Jan 2026 – Sep 2026

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform
*Apr 2026 – Aug 2026 · Nagpur, India*
- Architected the platform from 0→1: a Fastify (Node 22) backend with 24 API modules, 6 async background workers and, separately, 8 recurring cron loops.
- Started the job queue on PostgreSQL (FOR UPDATE SKIP LOCKED, no broker) to keep infrastructure small, then replaced it with RabbitMQ in the second update as load grew.
- Isolated provider failures with LLM failover routing (DeepInfra → Groq → Together AI), and protected billing with an atomic credit ledger (11 tiers) that issues compensating refunds when a worker fails.
- Built agentic tool use through an MCP layer with per-user access to Gmail, Calendar, GitHub, Notion, Slack and Postgres; shipped 23 PostgreSQL migrations.

### AI Engineer — AnnaRakshak AI (Google "Build with AI: Code for Communities" hackathon)
*Sep 2026*
- Designed guardrails for three Vertex AI agents (Google ADK): read-only tools, human-in-the-loop approval before any notice goes out, and an append-only audit log on Cloud Run, Firestore and Cloud Trace.

### Also built
- **TradingOS** (Feb – Apr 2026): migrated 221K+ bars and 1.78M flow events into TimescaleDB with zero data loss.
- **ChalOnline** (Jan – Feb 2026): took a SaaS to production in weeks and remediated a public database exposure.

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
