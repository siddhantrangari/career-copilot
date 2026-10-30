# Siddhant Rangari

**Senior Backend & AI Platform Engineer · 12+ Years · Bangalore, India**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com

## Professional Summary

Senior backend engineer with 12+ years designing, shipping and operating production systems: real-time clinical platforms at Philips Innovation Campus and GE Healthcare, and multi-tenant AI SaaS built from 0 to 1. Deep in backend architecture, APIs and PostgreSQL, with event-driven services on Kafka and RabbitMQ and Kubernetes operations on AWS EKS and Azure AKS. Builds agentic AI systems in production: tool use through MCP, LLM failover routing, retries and automatic refunds when a worker fails. Results include 70% faster dashboards, 98% more efficient APIs and 30–40% lower MTTR. Mentored 5+ junior developers. Learns new languages quickly and uses AI coding tools daily with careful review.

## Technical Skills

**Backend:** Java, Spring Boot, Spring Cloud, Spring Batch, Node.js (Fastify), TypeScript, Python (FastAPI), REST APIs, microservices, background jobs
**Data:** PostgreSQL (job queues with FOR UPDATE SKIP LOCKED, transactional ledgers, 23 schema migrations), MySQL, Redis, TimescaleDB
**Event-driven & distributed:** Kafka, RabbitMQ, async workers, failover chains, idempotent retries
**Agentic AI:** Multi-agent systems, MCP (Model Context Protocol) tool use, LLM routing & failover (DeepInfra, Groq, Together AI), RAG, Google ADK, Vertex AI, human-in-the-loop approvals
**Operations:** Kubernetes (EKS, AKS), Docker, ArgoCD GitOps, GitHub Actions, Prometheus, Grafana, Loki, Tempo, OpenTelemetry, CloudWatch

## Professional Experience

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Designed and owned the backend platform for an AI design-and-scheduling SaaS: 6 Spring Boot services on Azure AKS (masterdata, design-processing, design-rendering, event-processing, subscription, notification), each with a clear bounded responsibility.
- Set up GitOps delivery (GitHub → CI → ArgoCD → AKS) for zero-downtime rollouts across all services.
- Built a Spring Batch WhatsApp notification pipeline (100-record JDBC paging chunks, timezone-aware scheduling) with zero missed sends.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Built a real-time patient-monitoring backend streaming vitals from Kafka through Spring Boot to clinical dashboards with sub-second latency; worked with both Kafka and RabbitMQ.
- Designed a Kafka → AWS S3 decoupling pipeline that separated streaming from rendering and cut dashboard load time by 70%.
- Migrated a resource-heavy Apache Camel integration to a Spring Boot microservice, improving API efficiency by 98%; led a Redshift → EMR-on-EKS migration and S3 data lake.
- Built the observability stack (Prometheus, Grafana, Loki, Tempo, OpenTelemetry, CloudWatch), reducing MTTR by 30–40% and shortening incident diagnosis from hours to minutes.
- Mentored 5+ junior developers through code reviews and backend standards, lifting team delivery by 20%.

### Senior Software Engineer — GE Healthcare
*Sep 2020 – Jun 2021 · Bangalore, India*
- Built Spring Boot ingestion and transformation services integrating patient-monitoring hardware with EMR systems for real-time maternal-fetal vitals, where data accuracy is life-critical.

### Earlier roles
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — Spring Boot microservices and REST APIs for an agricultural data platform.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications (Spring MVC, Hibernate), deployed on AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India — Java EE web applications.

## Independent Engineering Projects | Jan 2026 – Sep 2026

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform
*Apr 2026 – Aug 2026 · Nagpur, India*
- Architected a Fastify (Node 22) backend from 0→1: 24 API modules, JWT auth, 6 async background workers and, separately, 8 recurring cron loops.
- Ran the job queue on PostgreSQL (FOR UPDATE SKIP LOCKED, no broker) in the first version, then replaced it with RabbitMQ in the second update.
- Built agentic tool use through an MCP integration layer with per-user access to Gmail, Calendar, GitHub, Notion, Slack and Postgres.
- Engineered LLM failover routing (DeepInfra → Groq → Together AI) that kept AI features near-zero-downtime through provider outages.
- Shipped an atomic credit ledger across 11 pricing tiers with automatic compensating refunds when a worker fails, plus 23 PostgreSQL migrations.

### AI Engineer — AnnaRakshak AI (Google "Build with AI: Code for Communities" hackathon)
*Sep 2026*
- Built three Vertex AI agents (Google ADK) with read-only tools, human-in-the-loop approvals and an append-only audit log on Cloud Run and Firestore, cutting detection-to-report time from 85–170 minutes to about one.

### Also built
- **TradingOS** (Feb – Apr 2026): Python market-data pipeline into TimescaleDB; migrated 221K+ bars and 1.78M flow events with zero data loss.
- **ChalOnline** (Jan – Feb 2026): creator SaaS taken to production in weeks (PostgreSQL, Redis); remediated a public database exposure.

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
