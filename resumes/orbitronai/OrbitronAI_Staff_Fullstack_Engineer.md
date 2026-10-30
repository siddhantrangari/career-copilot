# Siddhant Rangari

**Staff Full-Stack Engineer · Java Spring Boot, React & Agentic AI · 12+ Years · Bangalore, India**
siddhantrangari@gmail.com · +91 86689 88485 · linkedin.com/in/siddhant-rangari · siddhantrangari.com · github.com/siddhantrangari

## Professional Summary

Full-stack engineer with a founder's habits, having been one: co-founded and shipped three products from 0→1 in the last year, including a multi-tenant AI agent platform with LLM failover routing and an MCP tool layer. 12+ years of Java and Spring Boot microservices with React and TypeScript frontends, from real-time clinical systems at Philips and GE Healthcare (70% faster dashboards, 98% more efficient APIs, 30–40% lower MTTR) to a 6-service AI SaaS I architected and owned end to end. Owns API contracts, async workflows, observability and CI/CD, mentors engineers through code review and standards, and ships fast with AI coding assistants as a daily habit.

## Technical Skills

**Backend:** Java, Spring Boot, Spring Cloud, Spring Batch, Spring Security, OAuth2, Hibernate/JPA, microservices, REST API design, async workflows, Node.js (Fastify), Python (FastAPI)
**Frontend:** React 18, TypeScript, Next.js, Redux Toolkit, SSE streaming UIs, React Testing Library, Playwright
**Data & messaging:** PostgreSQL (job queues, transactional ledgers, 23 migrations), Redis, Kafka, RabbitMQ, TimescaleDB
**AI integration:** LLM agents and tool calling, MCP (Model Context Protocol), RAG pipelines, multi-agent workflows, LLM routing & failover, Google ADK, Vertex AI, LangChain
**Cloud & delivery:** GCP (Cloud Run, Vertex AI), AWS (S3, EMR, EKS), Azure (AKS), Docker, Kubernetes, GitHub Actions, ArgoCD GitOps, Prometheus, Grafana, OpenTelemetry

## Startup Products Built and Shipped | Jan 2026 – Sep 2026

### Founding Engineer (Co-Founder) — MyAgentFirm, multi-tenant AI agent platform
*Apr 2026 – Aug 2026 · Nagpur, India · myagentfirm.com*
- Built the platform end to end from 0→1: a Fastify (Node 22) backend with 24 API modules and JWT auth, a React frontend, 6 async background workers and, separately, 8 recurring cron loops.
- Integrated LLM agents into the product: an MCP layer giving agents per-user access to Gmail, Google Calendar, GitHub, Notion, Slack and Postgres, and LLM failover routing (DeepInfra → Groq → Together AI) for near-zero-downtime AI features.
- Shipped multi-step AI workflows customers used: auto-dubbing (Whisper → translate → TTS → ffmpeg), brand-kit generation (FLUX + LLM), Meta Ads automation and AI voice calls via Twilio.
- Ran the job queue on PostgreSQL (FOR UPDATE SKIP LOCKED) first, then moved to RabbitMQ as load grew; built an atomic credit ledger (11 pricing tiers) with automatic refunds on failed AI jobs and zero double-spend.

### AI Engineer — AnnaRakshak AI (Google "Build with AI: Code for Communities" hackathon)
*Sep 2026 · github.com/siddhantrangari/annarakshak-ai*
- Built on GCP: a deterministic anomaly detector over public mandi prices (caught a real −42.1% tomato price crash) feeding three Vertex AI agents (Google ADK) with read-only tools, human approval and an append-only audit log; detection-to-report time fell from 85–170 minutes to about one.

### Forward Deployed Engineer (Co-Founder) — TradingOS
*Feb 2026 – Apr 2026 · Nagpur, India*
- Built a React 18 / TypeScript trading platform with a backtesting engine and an AI coach (LLaMA 3 via Ollama) streaming responses over SSE; migrated 221K+ bars and 1.78M flow events into TimescaleDB with zero data loss.

### Founding Engineer (Co-Founder) — ChalOnline, creator SaaS
*Jan 2026 – Feb 2026 · Nagpur, India*
- Took a creator platform from architecture to production in weeks with PostgreSQL, Redis and Razorpay, signed its first paying customer, and found and fixed a production database exposure.

## Professional Experience

### Freelance Solutions Architect — Growlogic Technologies (Eeko.ai)
*May 2024 – Dec 2025 · Remote*
- Worked with the founder to turn business needs into architecture, then designed, built and owned 6 Spring Boot microservices on Azure AKS (masterdata, design-processing, design-rendering, event-processing, subscription, notification) and the React / Next.js frontend.
- Owned the API contracts between services, frontend and third parties (Razorpay subscriptions), secured with Spring Security and OAuth2; set GitOps delivery (GitHub → CI → ArgoCD → AKS) with zero-downtime rollouts.
- Built a Spring Batch notification pipeline (JdbcPagingItemReader, chunked, timezone-aware scheduling) with zero missed sends.

### Full-Stack Engineer — Software Technologist II — Philips Innovation Campus
*Sep 2021 – Feb 2024 · Bangalore, India*
- Built a real-time patient-monitoring pipeline from Kafka through Spring Boot to React with sub-second latency; a Kafka → AWS S3 decoupling cut dashboard load time by 70%.
- Migrated a resource-heavy Apache Camel integration to a Spring Boot microservice, improving API efficiency by 98%.
- Led the Redshift → EMR-on-EKS migration and S3 data lake architecture, coordinating across teams.
- Owned observability (Prometheus, Grafana, Loki, Tempo, OpenTelemetry, CloudWatch), cutting MTTR by 30–40%.
- Mentored 5+ developers through weekly code reviews, coding standards and pairing, lifting team delivery by 20%.

### Earlier roles
- **Senior Software Engineer — GE Healthcare** · Sep 2020 – Jun 2021 · Bangalore, India — Spring Boot services integrating patient-monitoring hardware with EMR systems, feeding React clinical dashboards.
- **Senior Software Engineer — Cropdata Technology** · Jun 2019 – Jun 2020 · Nagpur, India — Spring Boot APIs and React interfaces.
- **Software Engineer — Ajanta Photo and Technologies** · May 2016 – May 2019 · Nagpur, India — Java EE applications on AWS.
- **Java Developer — Naresh i Technologies** · Jun 2014 – Mar 2016 · Hyderabad, India.

## Education & Certification
- Diploma in Computer Technology — Late Vasantdada Polytechnic · 2016 · Nagpur, India
- Java Enterprise Development Certification — NareshIT · 2014 · Hyderabad, India
