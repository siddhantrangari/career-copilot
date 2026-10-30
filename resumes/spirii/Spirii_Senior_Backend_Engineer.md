# Siddhant Rangari

**Senior Backend Engineer · Node.js, TypeScript, Event-Driven Systems · 12+ Years · Bangalore, India · Open to relocating to Copenhagen**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com · github.com/siddhantrangari

## Professional Summary

Senior backend engineer with 12+ years designing and running production systems where correctness matters: real-time clinical data at Philips and GE Healthcare, and multi-tenant SaaS with billing built from 0 to 1. Builds Node.js and TypeScript services and queue-based, event-driven pipelines (PostgreSQL job queues, RabbitMQ, Kafka) on AWS and Azure. Designed an atomic credit ledger with 11 pricing tiers, compensating refunds and a full audit trail, with zero double-spend. Drives testing and observability (30–40% lower MTTR at Philips), mentored 5+ junior developers, and uses AI coding assistants and agentic workflows daily with careful review.

## Technical Skills

**Backend:** Node.js (Fastify, Express), TypeScript, Java (Spring Boot, Spring Batch, Spring Security), REST API design, OAuth2, JWT, microservices
**Event-driven and data:** PostgreSQL (FOR UPDATE SKIP LOCKED job queues, transactions, 23 schema migrations), RabbitMQ, Kafka, Redis, TimescaleDB, MySQL, Firestore, SQL data modelling
**Billing and payments:** atomic credit ledger, compensating refund transactions, idempotent processing, audit trails, Razorpay subscriptions, per-minute usage billing
**Cloud and operations:** AWS (S3, EMR, EKS, CloudWatch), Azure (AKS), Docker, Kubernetes, ArgoCD, GitHub Actions, Prometheus, Grafana, Loki, Tempo, OpenTelemetry
**Testing:** JUnit, Mockito, Jest, React Testing Library, Playwright
**AI engineering:** agentic workflows, MCP tool use, LLM routing and failover, AI coding assistants with review

## Professional Experience

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform
*Apr 2026 – Aug 2026 · Nagpur, India*
- Designed an atomic credit ledger across 11 pricing tiers: every debit and refund runs in one PostgreSQL transaction, a failed job triggers a compensating refund automatically, and every movement is audited. Zero double-spend.
- Built the job pipeline on a PostgreSQL queue (FOR UPDATE SKIP LOCKED, no broker) for the first version, then replaced it with RabbitMQ in the second update; 6 async background workers and, separately, 8 recurring cron loops.
- Built a Fastify (Node 22) backend with 24 API modules, JWT auth and 23 PostgreSQL migrations, integrating 12+ external APIs (Meta Marketing API, Twilio, ElevenLabs, Razorpay, Cloudflare R2).
- Designed per-minute usage billing for a real-time voice agent with a pricing rule that worst-case cost stays at or under 50% of price, and per-turn latency logging.
- Built LLM failover routing (DeepInfra → Groq → Together AI) that kept AI features near-zero-downtime through provider outages.

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Designed 6 Spring Boot microservices on Azure AKS (including event-processing, subscription and notification services) with Azure MySQL and Blob Storage, secured with Spring Security and OAuth2.
- Built a Spring Batch notification pipeline (JdbcPagingItemReader, chunk size 100, timezone-aware scheduling) with zero missed sends, and Razorpay subscription billing.
- Set up GitOps delivery (GitHub → CI → ArgoCD → AKS) for zero-downtime rollouts; worked directly with the founder on requirements.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Built a real-time patient-monitoring pipeline streaming vitals from Kafka through Spring Boot with sub-second latency; worked with both Kafka and RabbitMQ.
- Designed a Kafka → AWS S3 decoupling pipeline that cut dashboard load time by 70%.
- Migrated a resource-heavy Apache Camel integration to a Spring Boot microservice, improving API efficiency by 98%; led a Redshift → EMR-on-EKS migration and S3 data lake.
- Built observability with Prometheus, Grafana, Loki, Tempo, OpenTelemetry and CloudWatch, reducing MTTR by 30–40%.
- Mentored 5+ junior developers through weekly code reviews and backend standards, lifting team delivery by 20%.

### Senior Software Engineer — GE Healthcare
*Sep 2020 – Jun 2021 · Bangalore, India*
- Built Spring Boot ingestion and transformation services integrating monitoring hardware with EMR systems, where data accuracy is life-critical.

### Earlier roles
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — Spring Boot microservices and REST APIs integrating external data providers.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications (Spring MVC, Hibernate, Spring Security) on AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India.

## Selected Projects

- **TradingOS** (Feb – Apr 2026): time-series data pipeline into TimescaleDB with Databento and Binance collectors; migrated 221K+ bars and 1.78M flow events with zero data loss after finding a silent pg_dump hypertable bug.
- **ChalOnline** (Jan – Feb 2026): creator SaaS taken to production with PostgreSQL, Redis and Razorpay; found and fixed a production database exposure.
- **AnnaRakshak AI** (Google hackathon, Sep 2026): human-in-the-loop AI agents with an append-only audit log. github.com/siddhantrangari/annarakshak-ai

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
