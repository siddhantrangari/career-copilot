# Career Copilot — Standalone Migration & Production Deployment Walkthrough

We successfully moved **Career Copilot** out of `getmyagent-saas` into its own standalone directory, pushed it to a new GitHub repository, cleaned and secured the VPS, and deployed it live to **`career.myagentfirm.com`**.

---

## 1. Summary of Actions Completed

### A. Repository Migration & Push
* **Source Location:** `/Users/siddhant/DEV-ENV/AntiGravity/getmyagent-saas/career-copilot`
* **Destination Location:** `/Users/siddhant/DEV-ENV/AntiGravity/career-copilot`
* **New GitHub Repository:** 👉 **[https://github.com/siddhantrangari/career-copilot](https://github.com/siddhantrangari/career-copilot)** (Branch: `main`)

### B. Production Infrastructure Files Created
* **[`nginx/career.myagentfirm.conf`](file:///Users/siddhant/DEV-ENV/AntiGravity/career-copilot/nginx/career.myagentfirm.conf)** — Full SSL configuration with Cloudflare Real-IP restoration, security headers, Gzip, SPA routing, and proxying to backend port `4005`.
* **[`docker-compose.prod.yml`](file:///Users/siddhant/DEV-ENV/AntiGravity/career-copilot/docker-compose.prod.yml)** — Containerized PostgreSQL on port `5438`.
* **[`ecosystem.config.cjs`](file:///Users/siddhant/DEV-ENV/AntiGravity/career-copilot/ecosystem.config.cjs)** — PM2 process manager configuration for high uptime and cluster management.
* **[`scripts/setup-vps.sh`](file:///Users/siddhant/DEV-ENV/AntiGravity/career-copilot/scripts/setup-vps.sh)** — One-time VPS initialization script.
* **[`scripts/deploy.sh`](file:///Users/siddhant/DEV-ENV/AntiGravity/career-copilot/scripts/deploy.sh)** — 6-step zero-downtime deployment script.

### C. VPS Security Audit & Malware Remediation
* Investigated Hostinger's malware alert. Confirmed that the financial data collector (`tradeos_ingest.depth_collector` at **2.2% CPU**) was safe, and neutralized the rogue crypto miner (`/var/tmp/707730969` / `selinux` at **734% CPU**).
* Documented full incident report and cleanup script at:
  - 📁 [`utility-scripts/vps-monitor/INCIDENT_REPORT_2026-09-17_MALWARE_MINER.md`](file:///Users/siddhant/DEV-ENV/AntiGravity/utility-scripts/vps-monitor/INCIDENT_REPORT_2026-09-17_MALWARE_MINER.md)
  - 📜 [`utility-scripts/vps-monitor/cleanup-malware-2026-09-17.sh`](file:///Users/siddhant/DEV-ENV/AntiGravity/utility-scripts/vps-monitor/cleanup-malware-2026-09-17.sh)
* Enabled UFW firewall on VPS to strictly restrict inbound traffic to ports `22` (SSH), `80` (HTTP), and `443` (HTTPS).

### D. Production Deployment & Verification
* Cloned into `/var/www/career-copilot` on VPS.
* Executed `scripts/setup-vps.sh` & `scripts/deploy.sh`.
* Verified live endpoints:
  - **Frontend:** [https://career.myagentfirm.com](https://career.myagentfirm.com) → **HTTP/2 200 OK**
  - **API Health:** [https://career.myagentfirm.com/api/health](https://career.myagentfirm.com/api/health) → **`{"status":"ok","service":"Career Copilot Engine","model":"gpt-5.6-sol"}`**
