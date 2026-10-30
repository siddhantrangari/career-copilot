# Siddhant Rangari

**Senior Backend Engineer, Java & Spring Boot · Leading Projects End to End · 12+ Years · Bangalore, India · Open to relocating to Amsterdam**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com · github.com/siddhantrangari

## Professional Summary

Backend engineer with 12+ years of Java and Spring Boot, leading projects from requirements to production since 2021: real-time clinical platforms at Philips and GE Healthcare, a 6-service platform I architected and owned for an AI SaaS, and three products I co-founded and built from 0 to 1. Turns business requirements into scalable, resilient services on PostgreSQL, RabbitMQ and Kafka, runs them on Kubernetes and AWS, and owns their health through observability (30–40% lower MTTR at Philips). Leads by example: mentored 5+ developers through weekly code reviews, coding standards and pairing, lifting team delivery by 20%. Uses AI coding assistants and agentic workflows daily, with careful review.

## Technical Skills

**Backend:** Java, Spring Boot, Spring Cloud, Spring Batch, Spring Security, OAuth2, Hibernate/JPA, REST API design, microservices, Maven, Node.js (Fastify), TypeScript
**Data and messaging:** PostgreSQL (transactions, job queues, 23 schema migrations), MySQL, Redis, TimescaleDB, Kafka, RabbitMQ
**Cloud and operations:** AWS (S3, EMR, EKS, CloudWatch), Azure (AKS), Docker, Kubernetes, ArgoCD GitOps, GitHub Actions, Jenkins, Prometheus, Grafana, Loki, Tempo, OpenTelemetry
**Quality:** JUnit, Mockito, Jest, React Testing Library, Playwright, code review and engineering standards
**Frontend and AI:** React, Redux Toolkit, Next.js; agentic workflows, MCP tool use, LLM routing and failover

## Professional Experience

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Led the platform end to end for an AI design-and-scheduling SaaS: worked with the founder to turn business needs into the architecture, then designed, built and owned 6 Spring Boot services on Azure AKS (masterdata, design-processing, design-rendering, event-processing, subscription, notification).
- Set the delivery standard for every service: GitOps (GitHub → CI → ArgoCD → AKS) with zero-downtime rollouts.
- Built a Spring Batch notification pipeline (JdbcPagingItemReader, chunk size 100, timezone-aware scheduling) with zero missed sends, secured services with Spring Security and OAuth2, and shipped the React / Next.js frontend with Razorpay subscriptions.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Led the Redshift → EMR-on-EKS migration and S3 data lake architecture, coordinating with other teams on the migration.
- Built a real-time patient-monitoring pipeline from Kafka through Spring Boot to React with sub-second latency; worked with both Kafka and RabbitMQ.
- Designed a Kafka → AWS S3 decoupling pipeline that cut dashboard load time by 70%.
- Migrated a resource-heavy Apache Camel integration to a Spring Boot microservice, improving API efficiency by 98%.
- Owned observability (Prometheus, Grafana, Loki, Tempo, OpenTelemetry, CloudWatch), reducing MTTR by 30–40%.
- Mentored 5+ junior developers: coding standards, weekly code review sessions, microservices design patterns and pairing on their first production features, lifting team delivery by 20%.

### Senior Software Engineer — GE Healthcare
*Sep 2020 – Jun 2021 · Bangalore, India*
- Built Spring Boot services integrating patient-monitoring hardware with EMR systems for real-time maternal-fetal vitals, where data accuracy is life-critical.

### Earlier roles
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — Spring Boot microservices and REST APIs integrating external data providers.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications (Spring MVC, Hibernate, Spring Security) on AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India.

## Products Built and Led | Jan 2026 – Sep 2026

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform
*Apr 2026 – Aug 2026 · Nagpur, India*
- Led the technical direction from 0 to 1: a Fastify (Node 22) backend with 24 API modules, 6 async background workers and, separately, 8 recurring cron loops.
- Started the job queue on PostgreSQL (FOR UPDATE SKIP LOCKED, no broker), then replaced it with RabbitMQ in the second update as load grew.
- Designed an atomic credit ledger across 11 pricing tiers with automatic compensating refunds and a full audit trail: zero double-spend.
- Built LLM failover routing (DeepInfra → Groq → Together AI) and an MCP layer giving agents per-user access to Gmail, Calendar, GitHub, Notion, Slack and Postgres.

### Also built
- **TradingOS** (Feb – Apr 2026): decided what to build from traders' real workflow, then built a backtesting engine and a TimescaleDB market-data pipeline; migrated 221K+ bars and 1.78M flow events with zero data loss.
- **ChalOnline** (Jan – Feb 2026): creator SaaS taken to production in weeks; found and fixed a production database exposure.

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
