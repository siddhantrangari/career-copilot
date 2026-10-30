# Siddhant Rangari

**Backend Engineer · Java, Node.js, PostgreSQL · 12+ Years · Bangalore, India**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com

## Professional Summary

Backend engineer with 12+ years taking features from a clarified problem through shipping and follow-up in production. Builds APIs, background jobs and integrations in Java/Spring Boot and Node.js, works closely with data models, migrations and query behavior in PostgreSQL, and operates what he builds with metrics, logs and traces. Results include 70% faster dashboards, 98% more efficient APIs and 30–40% lower MTTR. Uses AI coding tools every day, reviews and corrects what they generate, and has shipped AI features to production. Comfortable working remotely and asynchronously with clear written updates.

## Technical Skills

**Backend:** Java, Spring Boot, Spring Batch, Node.js (Fastify), TypeScript, Python (FastAPI), REST APIs, background jobs, third-party integrations
**Data:** PostgreSQL (queues, transactions, 23 schema migrations), MySQL, Redis, TimescaleDB
**Messaging:** Kafka, RabbitMQ, async workers, retries
**Delivery & operations:** Docker, Kubernetes (EKS, AKS), ArgoCD, GitHub Actions, Prometheus, Grafana, OpenTelemetry, CloudWatch
**AI:** AI coding tools with review, LLM integration, MCP tool use, LLM failover

## Professional Experience

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Built and shipped 6 Spring Boot services on Azure AKS for an AI design-and-scheduling SaaS, from requirements with the founder to production.
- Built a Spring Batch background job sending WhatsApp notifications in 100-record JDBC pages with timezone-aware scheduling, with zero missed sends.
- Set up CI/CD with GitHub → CI → ArgoCD → AKS for zero-downtime deployments.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Built a real-time patient-monitoring backend streaming vitals from Kafka through Spring Boot APIs with sub-second latency; worked with both Kafka and RabbitMQ.
- Shipped a Kafka → AWS S3 pipeline that cut dashboard load time by 70%.
- Rebuilt an Apache Camel integration as a Spring Boot microservice with proper error handling, logging and monitoring, improving API efficiency by 98%.
- Added metrics, logs and traces (Prometheus, Grafana, Loki, Tempo, OpenTelemetry), reducing MTTR by 30–40%.
- Reviewed code and mentored 5+ junior developers, lifting team delivery by 20%.

### Senior Software Engineer — GE Healthcare
*Sep 2020 – Jun 2021 · Bangalore, India*
- Built Spring Boot ingestion and transformation services connecting monitoring hardware and EMR systems to clinical dashboards.

### Earlier roles
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — Spring Boot microservices and REST APIs, improving pipeline reliability with external data providers.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications with reporting, deployed on AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India — Java EE web applications.

## Independent Engineering Projects | Jan 2026 – Sep 2026

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform
*Apr 2026 – Aug 2026 · Nagpur, India*
- Built a Fastify (Node 22) backend with 24 API modules and JWT auth, 6 async background workers and, separately, 8 recurring cron loops.
- Ran the job queue on PostgreSQL (FOR UPDATE SKIP LOCKED, no broker) first, then replaced it with RabbitMQ in the second update.
- Wrote 23 PostgreSQL migrations and an atomic credit ledger across 11 pricing tiers that refunds automatically when a job fails.
- Integrated 12+ external APIs (Meta Marketing API, Twilio, ElevenLabs, Firebase Auth, Cloudflare R2) and LLM failover across DeepInfra → Groq → Together AI.

### AI Engineer — AnnaRakshak AI (Google "Build with AI: Code for Communities" hackathon)
*Sep 2026*
- Built a FastAPI service and three Vertex AI agents (Google ADK) on Cloud Run with read-only tools, human approval and an audit log.

### Also built
- **TradingOS** (Feb – Apr 2026): Python data pipeline into TimescaleDB; migrated 221K+ bars and 1.78M flow events with zero data loss.
- **ChalOnline** (Jan – Feb 2026): SaaS taken to production in weeks (PostgreSQL, Redis, Razorpay).

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
