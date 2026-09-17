# Career Copilot — AI-Powered Career Accelerator SaaS

> **Live Alternative to NxtJob.ai** — Designed with **Apple Cupertino aesthetics**, modular production-grade full-stack architecture, isolated PostgreSQL Docker container on port **5438**, and **`gpt-5.6-sol`** AI intelligence.
> Built for deployment under subdomain: **`career.myagentfirm.com`**.

---

## 🌟 Executive System Overview

Career Copilot replaces standard job search portals with a proactive, multi-agent AI system that accelerates executive and senior job searches 2X faster while securing 40% - 85% higher total compensation packages.

### The 9-Agent System
1. **Nova** — Central Career Strategist, diagnostic gap auditor, and pipeline manager.
2. **Resume Studio** — STAR & XYZ bullet optimizer transforming passive duty descriptions into high-converting metrics.
3. **ATS Tailor Engine** — Real-time keyword gap analysis comparing master resumes against target JDs with 1-click tailored resume generation.
4. **ATS Diagnostic Auditor** — Circular gauge match scoring (0-100), readability evaluation, and hard vs. soft skill balance.
5. **Job Hunter** — Executive opportunity discovery engine targeting senior roles beyond standard job boards.
6. **Networker** — High-response personalized LinkedIn connection requests, recruiter InMails, and peer intro drafts.
7. **Interviewer** — Live AI Mock Interview simulator with real-time STAR response grading and 90-second executive model answers.
8. **Pitcher** — 30-60-90 Day Strategic Blueprint and Win Deck generator for high-stakes interview presentations.
9. **Negotiator** — Executive compensation strategist producing counter-offer email scripts, verbal phone scripts, and objection handlers.

---

## 🎨 Apple Cupertino Design Language

- **Visuals**: Apple Dark Mode with deep space obsidian canvas (`#000000`), frosted glass panels (`backdrop-filter: blur(28px) saturate(180%)`), and subtle hairline borders (`rgba(255, 255, 255, 0.08)`).
- **Typography**: Apple SF Pro / Plus Jakarta Sans display typography, JetBrains Mono for metrics.
- **Micro-Interactions**: Apple Watch style circular activity ring for ATS scoring, Cupertino segmented pill switches, smooth transitions, and celebratory particle feedback upon landing offers.

---

## 🏗 Architecture & Stack

```
career-copilot/
├── docker-compose.yml          # Isolated PostgreSQL on Port 5438 (zero server collision)
├── docker/
│   └── init.sql                # Pre-seeded database schema (UUIDs, JSONB, indexes)
├── server/                     # Production Node.js + Express Layered Backend
│   ├── src/
│   │   ├── config/             # Strict environment & model validation
│   │   ├── db/                 # PostgreSQL connection pool with memory fallback
│   │   ├── services/
│   │   │   └── aiService.js    # gpt-5.6-sol driver with structured JSON schemas
│   │   ├── controllers/        # Express route controllers
│   │   └── routes/api.js       # REST endpoints
├── client/                     # React 18 + Vite Frontend
│   ├── src/
│   │   ├── styles/apple-theme.css # Apple Cupertino tokens & utilities
│   │   ├── components/         # AppleCard, CircularGauge, SegmentedControl, Navbar
│   │   └── pages/              # Landing, Dashboard, Resume, ATS, Interview, Kanban, Executive
└── .env                        # Port 4000, DB Port 5438, gpt-5.6-sol API key
```

---

## 🚀 Quickstart & Development

### 1. Start Isolated PostgreSQL Docker Container
```bash
# Spins up container 'career-copilot-postgres' on isolated port 5438
npm run docker:db:up
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Run Client and Server Concurrently
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`
- Database: `127.0.0.1:5438/career_copilot_db`

---

## 🌐 Subdomain Deployment (`career.myagentfirm.com`)

### Nginx Reverse Proxy Configuration
```nginx
server {
    server_name career.myagentfirm.com;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/career-copilot/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
```
