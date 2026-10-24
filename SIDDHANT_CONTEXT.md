# Siddhant Rangari — Full Context for Career Copilot

## Identity
- **Name**: Siddhant Rangari
- **Based**: Mumbai, India
- **Email**: siddhantrangari@gmail.com
- **LinkedIn**: https://linkedin.com/in/siddhant-rangari
- **Personal site**: siddhantrangari.com
- **Personal brand**: "India's AI Agents Guy"

## Job Search Goals
- **Target roles** (in priority order):
  1. Forward Deployed Engineer (FDE)
  2. AI Engineer / Applied AI Engineer / LLM Engineer
  3. Senior Full-Stack Engineer / Staff Engineer
  4. Solutions Engineer / Technical Solutions Engineer
- **Target markets**: EU remote (Germany, Netherlands, UK, France), Gulf (UAE, Dubai, Riyadh), Global remote (USD)
- **Compensation target**: $100k+ USD equivalent or tax-free Gulf package
- **DSA**: Does not want roles with LeetCode/algorithmic whiteboard interviews. Weak on DSA. Strong on system design, product thinking, real-world coding.
- **Open to**: Full-time remote, contract/high day rate, relocation if package is right
- **Timeline**: Urgent — needs income ASAP, no income for ~2.7 years
- **Available**: Immediately

## Career Timeline (accurate, legally clean)
| Period | Role | Notes |
|--------|------|-------|
| Jun 2014 – Mar 2016 | Java Developer at Naresh i Technologies, Hyderabad | Foundation Java/EE |
| May 2016 – May 2019 | Software Engineer at Ajanta Photo & Technologies, Nagpur | Java EE full-stack |
| Jun 2019 – Jun 2020 | Senior Software Engineer at Cropdata Technology, Nagpur | Java microservices + React |
| Sep 2020 – Jun 2021 | Senior Software Engineer at GE Healthcare, Bangalore | Maternal-fetal monitoring |
| Sep 2021 – Feb 2024 | Full-Stack Engineer (Software Technologist II) at Philips Innovation Campus, Bangalore | Real-time clinical systems |
| Feb 2024 – Apr 2024 | Career Break | Travel, marriage celebrations, personal reset |
| Apr 2024 – Jul 2025 | Freelance Solutions Architect at Growlogic Technologies (Eeko.ai), Remote | Azure AKS microservices SaaS |
| Aug 2025 – Sep 2025 | Independent: ChalOnline | Creator/education SaaS (Nagpur, India) — Founding Engineer (Co-Founder) |
| Oct 2025 – Feb 2026 | Independent: TradingOS | Trading platform with AI coaching (Nagpur, India) — Forward Deployed Engineer (Co-Founder) |
| Mar 2026 – Aug 2026 | Independent: MyAgentFirm | Multi-tenant AI agent platform (Nagpur, India) — Founding Engineer — MyAgentFirm (Co-Founder) |
| Sep 2026 | Actively job hunting | |

## Gap Explanation (interview answer)
"After Philips I took a deliberate two-month break — got married, travelled, reset. Then I took a freelance architecture engagement with Growlogic, designing and delivering their full Azure AKS microservices platform for their AI SaaS product. After that engagement ended, I spent a year building three production software products independently — going deep on LLM engineering, multi-agent systems, and full product ownership from architecture to deployment. Now with family settled and a year of intensive AI engineering behind me, I'm ready to bring all of that into a senior role at scale."

## Last Salary
~30 LPA at Philips (INR). No income since Feb 2024.

## Full Tech Stack
**Backend**: Java, Spring Boot, Spring Cloud, Spring Batch, Microservices, Node.js (Fastify, Express), Python, Servlet, JSP, Hibernate, Spring MVC, Apache Camel
**Frontend**: React 18, Next.js, TypeScript, JavaScript, Angular, AngularJS, JavaFX
**AI/LLM**: LangChain, Multi-Agent Systems, RAG pipelines, Prompt Engineering, LLM routing & failover (DeepInfra, Groq, Together AI, Ollama/LLaMA 3), OpenAI-compatible APIs, MCP (Model Context Protocol), FLUX image generation, Whisper STT, ElevenLabs TTS, Sarvam AI (Indic TTS)
**Infrastructure**: Docker, Kubernetes (AKS, EKS), AWS (S3, EMR, CloudWatch, Redshift), Azure (AKS, MySQL, Blob Storage, Load Balancer), Nginx, ArgoCD, CI/CD (GitHub Actions), Jenkins, Vagrant, Ansible
**Messaging**: Kafka, RabbitMQ
**Observability**: ELK Stack, Prometheus, Grafana, Loki, Tempo, OpenTelemetry, Sleuth, Zipkin, CloudWatch
**Databases**: PostgreSQL, MySQL, Redis, TimescaleDB, Firestore, VectorDB, Cloudflare R2, AWS S3
**API/Integration**: Meta Marketing API v21, Twilio (Voice + WhatsApp), WhatsApp Business API (WATI), Razorpay, Firebase Auth, Eureka Service Discovery, Zuul API Gateway, Replicate, Databento

## Key Projects (with real metrics)

### Philips Innovation Campus (Sep 2021 – Feb 2024)
**Project: Scalable Patient Dashboard System**
- Built real-time Patient Monitoring Dashboard: Kafka → Spring Boot → React, sub-second latency
- Kafka → AWS S3 pipeline: decoupled streaming from rendering, **70% load time reduction**
- Migrated Apache Camel process → Spring Boot microservice: **98% API efficiency improvement**
- Mentored 5+ junior developers: **20% team delivery improvement**
- Redshift → EMR on EKS migration + S3 data lake architecture
- Prometheus, Grafana, Loki, Tempo, OpenTelemetry, CloudWatch: **30-40% MTTR reduction**

### GE Healthcare (Sep 2020 – Jun 2021)
**Project: Maternal-Fetal Patient Monitoring**
- Integrations between hardware monitoring devices, EMR systems, and microservices
- Real-time display of mother and baby vitals on clinical React frontends
- Java Spring Boot data ingestion, transformation, delivery pipeline

### Growlogic Technologies / Eeko.ai (Apr 2024 – Jul 2025) — Freelance
**Project: AI Social Media Design & Scheduling SaaS**
- 6 Spring Boot microservices on Azure AKS (masterdata, design-processing, design-rendering, event-processing, subscription, notification)
- WhatsApp Business API notification pipeline via Spring Batch (100-record JDBC paging chunks, UTC→IST timezone scheduling)
- GitOps pipeline: GitHub → CI Build → ArgoCD → AKS cluster (zero-downtime deployments)
- React + Next.js frontend with Razorpay subscription management
- Automated design-prompt delivery with zero missed sends before budget issues closed it

### MyAgentFirm (Mar 2026 – Aug 2026) — Independent
**Project: Multi-Tenant AI Agent Platform**
- Fastify (Node 22/ESM) backend: 24 route modules, JWT auth
- Background job queuing via FOR UPDATE SKIP LOCKED on PostgreSQL (no dedicated queue broker)
- 8 recurring cron loops for concurrent AI media generation
- Complexity-aware LLM routing with failover: DeepInfra → Groq → Together AI
- 6 async background workers: AI video gen (Gathos/DeepInfra/Replicate fallback), auto-dubbing (Whisper→translate→TTS→ffmpeg mux), brand kit gen (FLUX+LLM), Meta Ads campaign automation, AI voice sales calls (Twilio), meeting bot
- Full MCP integration layer: Gmail, Google Calendar, GitHub, Notion, Slack, Postgres per-user
- Atomic credit ledger (Razorpay): 11 pricing tiers, auto-refund on worker failure
- 23 database migrations (PostgreSQL 15): agents, conversations, media jobs, outreach sequences, support inboxes, lead pipelines, ad campaigns, meeting recordings
- 12+ external API integrations: Meta Marketing API v21, Twilio Voice/WhatsApp, ElevenLabs TTS, Sarvam AI, Firebase Auth, Cloudflare R2, Replicate, DeepInfra, Groq, Together AI
- Deployed: Hostinger KVM VPS, Cloudflare, Nginx reverse proxy, Docker Compose

### TradingOS (Oct 2025 – Feb 2026) — Independent
**Project: ICT Methodology Trading Platform**
- Custom market data pipeline on VPS (Ubuntu 24.04, 8 cores, 31 GB RAM): TimescaleDB
- Real-time order book depth, tick-level trade flow, 1-min OHLC bars via Databento (MES futures) + Binance (crypto)
- Backtesting engine: lightweight-charts (TradingView) + custom SVG overlay (drawing tools, hit detection math, simulated order execution, equity curve tracking)
- AI coaching module: LLaMA 3 via Ollama, full live Firestore context injection, SSE streaming, conversation persistence
- 10-module platform with XP gamification system
- React 18 + TypeScript + Vite + Tailwind + Firebase + Node.js/Express

### ChalOnline (Aug 2025 – Sep 2025) — Independent
- Creator/education SaaS for coaches and workshop hosts
- Workshop funnels, subscription management, community tools
- Razorpay payments, PostgreSQL + Redis on VPS
- 1 paid customer (referred by co-founder Rajjat)

## CAR Achievement Stories (for interviews and WIN docs)

### Story 1: Kafka Pipeline at Philips
**Challenge**: Patient monitoring dashboard was slow to load due to tight coupling between real-time data streaming and dashboard rendering. Clinicians couldn't get timely patient status updates.
**Action**: Designed and implemented a Kafka → AWS S3 decoupling pipeline. Separated the streaming layer from the rendering layer. Built a Spring Boot microservice to consume Kafka topics, process and store data in S3, and serve it to the React frontend asynchronously.
**Result**: 70% reduction in dashboard load time. Sub-second latency for live vitals display. Zero data loss during peak load periods.

### Story 2: API Migration at Philips (Apache Camel → Spring Boot)
**Challenge**: Legacy Apache Camel integration process was resource-intensive, hard to maintain, and causing performance bottlenecks across multiple clinical data flows.
**Action**: Systematically mapped all Camel routes, rebuilt them as Spring Boot microservices with clean REST APIs and React frontend. Introduced proper error handling, logging, and monitoring.
**Result**: 98% improvement in API efficiency. Significantly reduced resource consumption. Improved maintainability for the team.

### Story 3: Observability at Philips
**Challenge**: When production incidents occurred, root cause identification was slow — no centralised observability across the distributed clinical system.
**Action**: Set up full observability stack: Prometheus for metrics, Grafana for dashboards, Loki for log aggregation, Tempo for distributed tracing, OpenTelemetry for instrumentation, CloudWatch for AWS-level monitoring.
**Result**: 30-40% reduction in Mean Time To Resolution (MTTR). Incidents that previously took hours to diagnose could be identified in minutes.

### Story 4: Team Mentoring at Philips
**Challenge**: Junior developers on the team were not following backend best practices, leading to inconsistent code quality and longer delivery cycles.
**Action**: Created coding standards documentation, ran weekly code review sessions, introduced microservices design patterns, and paired with each junior developer on their first production feature.
**Result**: 20% improvement in team delivery efficiency. Measurable improvement in code quality metrics. Two junior developers promoted to mid-level within 6 months.

### Story 5: LLM Failover System at MyAgentFirm
**Challenge**: The platform depended on external LLM providers for all AI features. Any single provider downtime would cause complete service failure for paying users.
**Action**: Designed and built a complexity-aware LLM routing system that automatically detects provider failures and routes requests through a failover chain: DeepInfra → Groq → Together AI. Each provider handles different model sizes based on task complexity.
**Result**: Near-zero downtime on all LLM-dependent features. Platform maintained 99%+ uptime across all AI features even during multiple provider outages.

### Story 6: Async Worker Architecture at MyAgentFirm
**Challenge**: AI media generation tasks (video generation, audio dubbing, brand kit creation) take 30-120 seconds. Running them synchronously would block API responses and create terrible UX.
**Action**: Built 6 async background workers using PostgreSQL's FOR UPDATE SKIP LOCKED pattern for job queuing — no dedicated queue broker (Redis/RabbitMQ) needed, reducing infrastructure complexity. Each worker handles a specific task type with its own fallback chain (e.g., Gathos → DeepInfra → Replicate for video).
**Result**: All long-running tasks are now non-blocking. Users receive immediate job confirmation and track progress via SSE. Failed jobs auto-refund credits via atomic SQL transactions.

### Story 7: MCP Integration Layer at MyAgentFirm
**Challenge**: AI agents were operating in isolation — they couldn't access user's real-world data (emails, calendar, code repos) to give contextually relevant responses.
**Action**: Built a full Model Context Protocol (MCP) integration layer enabling per-user authenticated connections to Gmail, Google Calendar, GitHub, Notion, Slack, and Postgres. Each user's agents operate with their actual live data context.
**Result**: Agents became dramatically more useful — calendar-aware scheduling, inbox-aware communication agents, code-aware development assistants. Key differentiator vs competitors.

### Story 8: Atomic Credit Ledger at MyAgentFirm
**Challenge**: A multi-tenant SaaS with 11 different feature pricing tiers needs a bulletproof credit system. Any double-spend or unrefunded failed job costs the business money and erodes user trust.
**Action**: Built an atomic credit ledger using PostgreSQL transactions. Every debit and refund is wrapped in a SQL transaction that can't partially commit. If a background worker fails after a debit, the job failure handler runs a compensating refund transaction atomically. 11 pricing tiers tracked at the feature level.
**Result**: Zero double-spend incidents. Every failed job results in automatic refund within seconds. Full audit trail for every credit transaction.

### Story 9: Azure AKS Microservices at Growlogic/Eeko.ai
**Challenge**: Eeko.ai needed to go from a monolith to a scalable microservices architecture on Azure to handle growing SMB customer base with different subscription plans.
**Action**: Designed and implemented 6 Spring Boot microservices (masterdata, design-processing, design-rendering, event-processing, subscription, notification) deployed on Azure AKS. Set up Azure MySQL and Blob Storage. Built WhatsApp Business API notification pipeline via Spring Batch.
**Result**: System handles concurrent design generation and notification delivery for multiple customers simultaneously. Zero-downtime deployments via ArgoCD GitOps pipeline.

### Story 10: TimescaleDB Market Data Pipeline at TradingOS
**Challenge**: Collecting real-time order book depth data (thousands of price levels updated every second) for trading research requires specialised time-series infrastructure. Laptop storage ran out within weeks.
**Action**: Migrated from laptop to VPS (Ubuntu 24.04, 8 cores, 31 GB RAM). Set up TimescaleDB with automated systemd services. Built collectors for Databento (MES futures tick data) and Binance (crypto order book depth). Solved pg_dump hypertable chunk issue with COPY workaround.
**Result**: Storage runway extended from 3 months to 183 months. Collectors are always-on via systemd (survives reboots). Collecting 3 instruments simultaneously with 275 GB free.

### Story 11: Custom Backtesting Engine at TradingOS
**Challenge**: Commercial backtesting tools don't support ICT methodology properly — they can't display order flow, volume profile, or proper position blocks with risk-reward visualisation.
**Action**: Built a custom backtesting engine on top of lightweight-charts (TradingView's open-source library). Added an absolute-positioned SVG overlay for drawing tools (trend lines, rectangles, freehand paths, position blocks). Implemented custom hit detection math for interactive drawings. Added simulated order execution with equity curve tracking.
**Result**: First backtesting tool that natively supports ICT methodology with full order flow visualisation. Enables proper pre- and post-trade analysis.

### Story 12: GE Healthcare Hardware Integration
**Challenge**: Connecting proprietary maternal-fetal monitoring hardware to an EMR system and clinical frontend requires complex data transformation across multiple protocols.
**Action**: Built Java Spring Boot integration services that bridge the hardware devices, EMR system, and clinical dashboard. Handled data format transformation, real-time streaming, and error recovery.
**Result**: Clinical staff could monitor mother and baby vitals in real-time with reliable data integrity. Product used in hospital environments where data accuracy is life-critical.

## Personality / Context
- Married to Preethi; daughter Arha is 1.1 years old
- Parents supported financially during the gap — borrowing + personal savings covered expenses
- Has EMI obligations — urgent financial pressure to land a role
- Genuine technical depth — has built and shipped every system mentioned above solo or in small teams
- Weakness: DSA/LeetCode algorithms, confidence in interviews (getting better with practice)
- Strength: End-to-end product engineering, AI/LLM implementation, system design, full-stack ownership, shipping fast
- Runs multiple ventures simultaneously — co-founder at ChalOnline with Rajjat
- Hosting everything on Hostinger KVM VPS with Docker Compose + Nginx
