# GitLab — cover letters and form answers

Roles (all Bangalore, India, remote):
- Senior Backend Engineer, India — https://job-boards.greenhouse.io/gitlab/jobs/8716143002 → resume `1_Senior_Backend_Engineer.md`
- Staff Backend Engineer, India — https://job-boards.greenhouse.io/gitlab/jobs/8775136002 → resume `2_Staff_Backend_Engineer.md`
- Intermediate Backend Engineer, India — https://job-boards.greenhouse.io/gitlab/jobs/8775507002 → resume `3_Intermediate_Backend_Engineer.md`

---

## Cover letter — Senior Backend Engineer

Hi GitLab team,

I've spent 12 years building and running backend systems, most recently a multi-tenant AI agent platform with agents running in production. It routes LLM calls across three providers with automatic failover, gives agents tool access through MCP, and refunds credits atomically when a worker fails. Before that, at Philips I cut clinical dashboard load time by 70% with a Kafka → S3 redesign and reduced MTTR by 30–40% with a full observability stack. Your focus on loops, tool use and error handling, rather than prompts alone, is the work I've been doing. I'd welcome the chance to bring it to a platform at GitLab's scale.

Best regards,
Siddhant Rangari

## Cover letter — Staff Backend Engineer

Hi GitLab team,

Modernizing a large backend without breaking it is the work I've done most. At Philips I rebuilt an Apache Camel integration as a Spring Boot microservice (98% more efficient APIs) and led a Redshift → EMR-on-EKS migration. At Growlogic I designed and owned a 6-service platform on Azure AKS with GitOps zero-downtime delivery. Most recently I've run agentic AI in production with the guardrails you describe: read-only tools, human approval before anything goes out, and an append-only audit log. My cross-team leadership has come through mentoring and setting standards, not a formal Staff title, and I'd be glad to talk through how that maps to this role.

Best regards,
Siddhant Rangari

## Cover letter — Intermediate Backend Engineer

Hi GitLab team,

I like owning a feature from the first question to how it behaves in production. That has meant Spring Boot and Node.js APIs, background jobs, PostgreSQL migrations and queues, and the metrics and traces that show whether it works; at Philips that observability cut MTTR by 30–40%. I use AI coding tools every day and review what they produce before it ships. I'd enjoy doing that on a product used by millions, with GitLab's written, asynchronous way of working.

Best regards,
Siddhant Rangari

---

## Form answers (same for all three roles)

| Question | Answer |
|---|---|
| LinkedIn Profile | https://www.linkedin.com/in/siddhant-rangari/ |
| Preferred name | Siddhant |
| Current country of residence | India |
| Located in Bangalore or willing to relocate before joining? | Yes, I'm based in Bangalore. |
| Employment agreements or post-employment restrictions? | No (only if true: confirm nothing from Philips or Growlogic still applies) |
| Accessibility adjustments | None needed, thank you. |
| GitLab username | Your gitlab.com username. If you don't have one, create a free account first; the field is optional. |
| Require visa sponsorship for your current location? | No |
| Previously worked at or consulted for GitLab? | No |
| Primary programming language and/or framework | Java with Spring Boot (12 years). Also Node.js/TypeScript with Fastify and Python with FastAPI for AI services. |

**Open source projects (required).** Most of my production code lives in private employer and client repositories. Public work:
- GitHub: `https://github.com/<your-username>`, **fill in your real profile**
- Live products I built and run: myagentfirm.com (multi-tenant AI agent platform), tradeos.cjpmarket.com (trading platform), chalonline.com (creator SaaS)
- AnnaRakshak AI, Google "Build with AI: Code for Communities" hackathon (Sep 2026): `<repo link, if public>`

Paste only links that are real and public. If you have no public repos, keep the first sentence and the live products.

---

## Language requirements (checked against all three postings)

None of the three requires Go, Ruby/Rails, Rust or ClickHouse.
- **Senior:** none of them mentioned; ClickHouse appears only as a "helpful" database example.
- **Staff:** all "helpful", but the duties include establishing Go service patterns and guiding Rust adoption. This is the real gap, and interviewers will probe it.
- **Intermediate:** "Ruby/Rails, Go, or any other modern backend language", so Java qualifies.

GitLab's main product is a Ruby on Rails monolith with Go services, so Rails is the day-to-day language. Before interviews, learn Rails basics (models, migrations, ActiveRecord queries, Sidekiq background jobs). Interview line: "I've started on Rails; it maps closely to Spring Boot and JPA, which I've used for 12 years."
