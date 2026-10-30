# Siddhant Rangari

**Senior Backend & Platform Engineer · Java & Spring Boot · AWS / Kubernetes · Agentic Engineering · 12+ Years · Bangalore, India · Ready to relocate to Belgium / EU**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com · github.com/siddhantrangari

## Professional Summary

Backend engineer first, with 12+ years of Java and Spring Boot, who designs and builds services and then owns them all the way to production on Kubernetes and AWS / Azure. Built multi-tenant SaaS backends end to end: 6 Spring Boot services on AKS with GitOps delivery, real-time Kafka pipelines at Philips and GE Healthcare, and three products I co-founded and shipped from 0 to 1. Treats observability and tests as part of the feature: owned the Prometheus / Grafana / OpenTelemetry stack at Philips and cut MTTR by 30–40%. Ships production code every day with AI coding agents (Claude Code) in the loop, and builds the agent instructions, skills and test feedback loops that keep their output at a high bar. Has built LLM-powered features for real users: failover routing across model providers, tool-using agents over MCP, and human-in-the-loop approvals.

## Technical Skills

**Backend:** Java, Spring Boot, Spring Security, Spring Batch, OAuth2, Hibernate/JPA, REST API design, async processing, concurrency and row-level locking, microservices, Maven, Node.js (Fastify)
**Platform:** Kubernetes (Azure AKS, AWS EKS), AWS (EKS, S3, EMR, CloudWatch, IAM), Docker, ArgoCD GitOps, GitHub Actions, Jenkins, Linux, shell scripting
**Observability:** Prometheus, Grafana, Loki, Tempo, OpenTelemetry, CloudWatch
**Data:** MySQL, PostgreSQL (schema design, query tuning, 23 production migrations), TimescaleDB, Redis, Kafka, RabbitMQ
**Testing:** JUnit, Mockito, Testcontainers, Jest, Playwright
**Frontend:** TypeScript, React 18, Next.js
**Agentic engineering:** Claude Code in daily delivery, agent instructions and skills, MCP tool servers, LLM routing and failover, human-in-the-loop agents; Python (FastAPI)

## Professional Experience

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Owned a multi-tenant AI design-and-scheduling SaaS from concept to production: worked directly with the founder and customers to decide what to build, then built and shipped it.
- Built the customer-facing React / Next.js / TypeScript frontend with Redux Toolkit and Razorpay subscriptions, tested with Jest, React Testing Library and Playwright e2e.
- Designed 6 Spring Boot services on Azure AKS (masterdata, design-processing, design-rendering, event-processing, subscription, notification), secured with Spring Security and OAuth2.
- Built an async Spring Batch notification pipeline (paged readers, chunks of 100, timezone-aware scheduling) with zero missed sends.
- Set up GitOps delivery (GitHub → CI → ArgoCD → AKS) for zero-downtime releases.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Built a real-time patient-monitoring dashboard streaming vitals from Kafka through Spring Boot to a React frontend with sub-second latency.
- Designed a Kafka → AWS S3 decoupling pipeline that cut dashboard load time by 70%.
- Refactored a resource-heavy Apache Camel integration into a Spring Boot microservice with a React frontend, improving API efficiency by 98%.
- Owned observability (Prometheus, Grafana, Loki, Tempo, OpenTelemetry, CloudWatch), cutting MTTR by 30–40%.
- Ran weekly code reviews and pairing with 5+ junior developers, lifting team delivery by 20%.

### Senior Software Engineer — GE Healthcare
*Sep 2020 – Jun 2021 · Bangalore, India*
- Built Spring Boot services connecting patient-monitoring hardware to EMR systems, delivering real-time maternal-fetal vitals to React clinical dashboards.

### Earlier roles
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — Spring Boot microservices and REST APIs on MySQL; React interfaces for field data capture and reporting.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications (Spring MVC, Hibernate, Spring Security) on MySQL and AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India.

## Products Built | Jan 2026 – Oct 2026

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform
*Apr 2026 – Aug 2026 · Nagpur, India*
- Built the product from 0 to 1 and shipped it to paying users: a Fastify (Node 22, TypeScript) backend with 24 API modules, 6 async background workers and 8 recurring jobs.
- Built LLM features for real users: failover routing across providers (DeepInfra → Groq → Together AI) and an MCP layer giving agents per-tenant access to Gmail, Calendar, GitHub, Notion, Slack and Postgres.
- Designed an atomic credit ledger across 11 pricing tiers with automatic compensating refunds and a full audit trail: zero double-spend.
- Started the job queue on PostgreSQL (FOR UPDATE SKIP LOCKED), then moved it to RabbitMQ as load grew.

### Also built
- **Career Copilot** (Sep – Oct 2026): a personal job-search platform (Fastify, PostgreSQL, TypeScript) built agentically with Claude Code, with project-level agent rules, backup-first data safety and tested deploys.
- **Transaction Ledger API** (Oct 2026): Java 21 / Spring Boot 3 / PostgreSQL ledger with database-enforced integrity, row-level locking and Testcontainers concurrency tests — github.com/siddhantrangari/confluencr-ledger-api-java
- **TradingOS** (Feb – Apr 2026): React 18 / TypeScript trading platform with a backtesting engine; migrated 221K+ bars and 1.78M flow events into TimescaleDB with zero data loss.
- **AnnaRakshak AI** (Sep 2026, Google "Build with AI" hackathon): FastAPI and Next.js app with three Vertex AI agents, human-in-the-loop approvals and an audit log.

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
