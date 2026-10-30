# Siddhant Rangari

**Software Engineer · Java, Spring Boot, TypeScript & React · Product-Minded · 12+ Years · Bangalore, India · Open to relocating to Amsterdam**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com · github.com/siddhantrangari

## Professional Summary

Hands-on product engineer with 12+ years of Java and Spring Boot and 6+ years of production React and TypeScript, who owns features from concept to production. Built customer-facing products end to end: an AI design-and-scheduling SaaS with subscriptions, real-time clinical dashboards at Philips and GE Healthcare, and three products I co-founded and shipped from 0 to 1. Treats technology as a means to an end: starts from the user's problem, picks the simplest tool that solves it, then measures the result (70% faster dashboards, 98% more efficient APIs, 30–40% lower MTTR at Philips). Builds on PostgreSQL, RabbitMQ and Kafka, ships on Docker, Kubernetes and AWS. Works with AI coding assistants and agentic workflows every day, reviewing what they produce with care.

## Technical Skills

**Backend:** Java, Spring Boot, Spring Cloud, Spring Batch, Spring Security, OAuth2, Hibernate/JPA, REST API design, microservices, Maven, Node.js (Fastify)
**Frontend:** TypeScript, React 18, Redux Toolkit, Next.js, Vite, JavaScript (ES6+)
**Data and messaging:** PostgreSQL (transactions, job queues, 23 schema migrations), MySQL, Redis, TimescaleDB, Kafka, RabbitMQ
**Cloud and operations:** AWS (S3, EMR, EKS, CloudWatch), Azure (AKS), Docker, Kubernetes, ArgoCD GitOps, GitHub Actions, Jenkins, Prometheus, Grafana, OpenTelemetry
**Quality:** JUnit, Mockito, Jest, React Testing Library, Playwright
**AI engineering:** agentic coding workflows, MCP tool use, LLM routing and failover, human-in-the-loop agents; Python (FastAPI)

## Professional Experience

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Owned an AI design-and-scheduling SaaS from concept to production: worked with the founder to turn customer needs into features, then built and shipped them.
- Built the customer-facing React / Next.js frontend with Redux Toolkit and Razorpay subscriptions, tested with Jest, React Testing Library and Playwright.
- Designed 6 Spring Boot services on Azure AKS (masterdata, design-processing, design-rendering, event-processing, subscription, notification), secured with Spring Security and OAuth2.
- Built a Spring Batch WhatsApp notification pipeline (JdbcPagingItemReader, chunk size 100, timezone-aware scheduling) with zero missed sends.
- Set up GitOps delivery (GitHub → CI → ArgoCD → AKS) for zero-downtime rollouts, so features reached users without maintenance windows.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Built a real-time patient-monitoring dashboard streaming vitals from Kafka through Spring Boot to a React frontend with sub-second latency.
- Designed a Kafka → AWS S3 decoupling pipeline that cut dashboard load time by 70%.
- Refactored a resource-heavy Apache Camel integration into a Spring Boot microservice with a React frontend, improving API efficiency by 98%.
- Owned observability (Prometheus, Grafana, Loki, Tempo, OpenTelemetry, CloudWatch), reducing MTTR by 30–40%.
- Helped the team grow: weekly code reviews and pairing with 5+ junior developers, lifting team delivery by 20%.

### Senior Software Engineer — GE Healthcare
*Sep 2020 – Jun 2021 · Bangalore, India*
- Built Spring Boot services integrating patient-monitoring hardware with EMR systems, delivering real-time maternal-fetal vitals to React clinical dashboards.

### Earlier roles
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — Spring Boot microservices and REST APIs; React interfaces for field data capture and reporting.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications (Spring MVC, Hibernate, Spring Security) on AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India.

## Products Built | Jan 2026 – Sep 2026

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform
*Apr 2026 – Aug 2026 · Nagpur, India*
- Built the product from 0 to 1: a Fastify (Node 22, TypeScript) backend with 24 API modules, 6 async background workers and 8 recurring cron loops.
- Started the job queue on PostgreSQL (FOR UPDATE SKIP LOCKED, no broker), then moved it to RabbitMQ as load grew: the simple tool first, the bigger one when needed.
- Designed an atomic credit ledger across 11 pricing tiers with automatic compensating refunds and a full audit trail: zero double-spend.
- Built LLM failover routing (DeepInfra → Groq → Together AI) and an MCP layer giving agents per-user access to Gmail, Calendar, GitHub, Notion, Slack and Postgres.

### Also built
- **TradingOS** (Feb – Apr 2026): a React 18 / TypeScript trading platform shaped around traders' real workflow, with a backtesting engine; migrated 221K+ bars and 1.78M flow events into TimescaleDB with zero data loss.
- **AnnaRakshak AI** (Sep 2026, Google "Build with AI: Code for Communities" hackathon): FastAPI and Next.js app with three Vertex AI agents, human-in-the-loop approvals and an audit log.
- **ChalOnline** (Jan – Feb 2026): creator SaaS taken to production in weeks; found and fixed a production database exposure.

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
