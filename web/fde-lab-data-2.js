/** FDE Lab — days 16–30. See fde-lab-data-1.js for the method. */
window.FDE_LAB.days.push(
  {
    day: 16, week: 3, focus: 'Build: an agent with a human in the loop', domain: 'Healthcare · Dental clinics',
    title: 'OpsPilot agent worker: no-show recovery for a dental chain',
    business: { name: '40-clinic dental chain, Pune (composite)', profile: 'Same no-show problem as day 2, different business: private dental clinics where an empty chair costs more. Front-desk staff call patients by hand.' },
    data: [{ name: 'Medical Appointment No Shows (from day 2, used as stand-in history)', url: 'https://www.kaggle.com/datasets/joniarroba/noshowappointments', use: 'Import as workspace "dental-pune" cases.' }],
    pain: ['Read Google reviews of dental clinics mentioning waiting or rescheduling.'],
    people: [
      { role: 'Clinic chain owner', cares: 'Chair utilisation and revenue per chair.', hidden: 'Front desk will not trust an AI that messages patients on its own; every message must be approved for the first month.' },
    ],
    ask: ['What is an empty chair-hour worth?', 'What should the agent never do without a person?'],
    sql: ['Use day 2 rules to set case priority on import.'],
    value: 'Value = chair-hours recovered per month x revenue per chair-hour.',
    build: {
      goal: 'A Node.js TypeScript agent worker that reads high-priority cases from the core, drafts a reminder or backfill message with tool calls, and requests approval instead of acting.',
      prompt: `Day 16 of my FDE lab. Create opspilot/agent as a Node.js 22 TypeScript service next to opspilot/core.

Behaviour: every minute, fetch cases from the core API (GET /cases?workspace=dental-pune&status=open&priority=high). For each, run an LLM agent loop (OpenAI-compatible chat API with tool calling; env LLM_BASE_URL, LLM_API_KEY, LLM_MODEL) with these tools only:
- get_case(id): reads the case from the core
- list_open_slots(date): returns free slots from a small JSON file standing in for the clinic calendar
- propose_message(case_id, channel: sms|whatsapp, text): does NOT send; it calls the core POST /approvals with requested_action {send_message, text}
- propose_backfill(case_id, slot): also creates an approval, never books
The agent cannot send or book anything itself. Limit the loop to 5 tool calls per case, log every call, and stop with a clear error on a tool failure.

Also: core gets a "dental-pune" workspace via the CSV import with mapping, and a rule that sets priority high from the day 2 risk reasons.
React console (opspilot/console, Vite): a page listing pending approvals with Approve and Reject buttons that call the core.
README: the safety model in plain words (agent proposes, human approves, everything audited).`,
    },
    deliver: ['Agent worker with 4 tools', 'Approvals queue in the console', 'Workspace 2 imported', 'Agent cannot act without approval'],
    video: `[Face] Day 16. A dental chain where an empty chair costs real money.
[Screen] The agent reads tomorrow's high-risk appointments, checks free slots, and drafts a reminder. It cannot send it.
[Screen] Here is the approvals queue. The front desk approves, and the audit log records who did.
[Face] Agents that propose and people that approve is how customers start trusting AI.`,
    post: `The clinic owner's rule for the AI: it can draft every message, it can send none.

Day 16 of my 30-day FDE lab: the first agent on my OpsPilot platform.

- A Node.js agent with four tools: read a case, check open slots, propose a message, propose a backfill
- Every proposal lands in an approvals queue for the front desk
- Every approval is written to an audit log nobody can edit

Workspace two is a 40-clinic dental chain, onboarded with the same CSV import as day 15.

Tomorrow: the agent learns the customer's policies.`,
  },
  {
    day: 17, week: 3, focus: 'Build: RAG grounded in the customer\'s own documents', domain: 'Banking · Credit card disputes',
    title: 'OpsPilot RAG: dispute replies grounded in policy for a card issuer',
    business: { name: 'Credit card issuer (composite)', profile: 'A different bank from day 6: a card issuer with a dispute team. Replies must follow written policy and dispute timelines exactly.' },
    data: [{ name: 'CFPB complaints, credit card disputes (from day 6)', url: 'https://www.consumerfinance.gov/data-research/consumer-complaints/', use: 'Import 500 dispute complaints as workspace "card-disputes".' }],
    pain: ['Read dispute complaints where the consumer says the bank ignored its own timeline.'],
    people: [{ role: 'Head of Disputes', cares: 'Consistent, policy-correct replies.', hidden: 'Policies change quarterly; answers must cite the current version and its date.' }],
    ask: ['How do agents find the right policy today?', 'How often do policies change, and who owns them?'],
    sql: ['Dispute issues by frequency to decide which policies to write first.'],
    value: 'Value = disputes per year x minutes saved finding policy x cost per minute + rework avoided from wrong answers.',
    build: {
      goal: 'RAG over versioned policy documents: retrieve, answer with citations, refuse when no policy covers the question.',
      prompt: `Day 17 of my FDE lab. Add RAG to opspilot/agent.

1. Policies: create opspilot/policies/card-disputes/ with 8 short markdown policies you write (each with a version and effective date in front matter).
2. Indexing: chunk policies by heading, embed with an OpenAI-compatible embeddings endpoint (env EMBED_MODEL), store vectors in PostgreSQL with pgvector in the core database (Flyway migration in core). Re-index only changed files.
3. Tool search_policy(query, workspace) returns the top 4 chunks with file, heading, version and date.
4. A draft_reply flow for a dispute case: the agent must call search_policy, answer citing [policy file, version], and if no chunk scores above a threshold it must return "No policy covers this; route to a specialist" instead of answering. Draft goes to approvals as on day 16.
5. An eval set eval/disputes.jsonl with 15 questions and the policy that should be cited; a script that reports citation accuracy and refusal accuracy.
README: how versions and refusals work.`,
    },
    deliver: ['Versioned policies indexed in pgvector', 'Replies with citations', 'Refusal when no policy applies', 'Eval: citation and refusal accuracy'],
    video: `[Face] Day 17. A card issuer that needs every dispute reply to follow current policy.
[Screen] The agent searches the policies, cites file and version, and drafts the reply for approval.
[Screen] Ask it something no policy covers and it refuses and routes to a specialist.
[Face] My eval set says citation accuracy is [X%] and refusals are right [Y%] of the time.`,
    post: `The most useful answer my agent gave today was "No policy covers this; route to a specialist."

Day 17 of my 30-day FDE lab: retrieval grounded in a card issuer's own policies.

- Policies are versioned and dated, and every reply cites file and version
- When nothing relevant is found, the agent refuses instead of guessing
- A 15-question eval set: citation accuracy [X%], refusal accuracy [Y%]

Refusing well matters more in banking than answering fast.

Tomorrow: connecting to a customer's live systems.`,
  },
  {
    day: 18, week: 3, focus: 'Build: integrations with the customer\'s systems', domain: 'E-commerce · D2C brand',
    title: 'OpsPilot connectors: late-order alerts for a D2C brand',
    business: { name: 'D2C skincare brand on a marketplace (composite)', profile: 'Sells through its own site and a marketplace. Orders and carrier updates arrive by webhook; customer service learns about late orders from angry emails.' },
    data: [{ name: 'Olist orders (from day 3) replayed as webhooks', url: 'https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce', use: 'Replay order and delivery events in time order to simulate live webhooks.' }],
    pain: ['Read one-star reviews mentioning "no update" or "where is my order".'],
    people: [{ role: 'Head of Customer Experience', cares: 'Contacting customers before they complain.', hidden: 'Their helpdesk only accepts new tickets by email or its REST API, with a rate limit of 60 calls a minute.' }],
    ask: ['Which systems must this connect to, and how do they accept data?', 'What is the rate limit and who owns the API key?'],
    sql: ['Orders predicted late: no carrier pickup 2 days after approval.'],
    value: 'Value = late orders contacted proactively x reduction in complaint tickets x cost per ticket + reviews protected.',
    build: {
      goal: 'A webhook connector with signature checks and idempotency, a late-order rule, and a rate-limited helpdesk connector.',
      prompt: `Day 18 of my FDE lab. Add connectors to opspilot/core.

1. POST /hooks/{workspace}/{source}: verify an HMAC-SHA256 signature header with a per-source secret, store the raw event, and make processing idempotent on the event id (a unique constraint plus ON CONFLICT DO NOTHING). Map order events to cases in workspace "d2c-skincare".
2. A replay script (Node.js) that reads Olist orders and posts them as signed webhooks in time order, 50 per second.
3. A rule: order approved and no carrier pickup within 48 hours sets priority high and requests an approval to open a helpdesk ticket.
4. A helpdesk connector (core, Spring) that, after approval, creates a ticket through a mock REST API with a token-bucket limit of 60 per minute and retries with backoff on 429 responses.
5. Tests for signature failure, duplicate events and the rate limiter.
README: integration checklist for a real customer (auth, rate limits, retries, idempotency, monitoring).`,
    },
    deliver: ['Signed, idempotent webhooks', 'Late-order rule', 'Rate-limited helpdesk connector', 'Integration checklist'],
    video: `[Face] Day 18. A D2C brand that hears about late orders from angry emails.
[Screen] Orders arrive as signed webhooks. Send the same event twice and it is processed once.
[Screen] No pickup in 48 hours opens an approval to contact the customer, and the helpdesk connector respects their 60-per-minute limit.
[Face] Most customer implementations live or die on integrations like this.`,
    post: `The customer's helpdesk accepts 60 calls a minute. My connector had to respect that before anything else.

Day 18 of my 30-day FDE lab: integrations, the unglamorous core of customer work.

- Webhooks with signature checks, processed once even when sent twice
- A rule that flags orders with no pickup after 48 hours
- A helpdesk connector with a rate limiter and retries

Workspace three is a D2C skincare brand, replayed from real marketplace orders.

Tomorrow: measuring whether the AI is right.`,
  },
  {
    day: 19, week: 3, focus: 'Build: evaluation, guardrails, cost and latency', domain: 'Automotive · Service centres',
    title: 'OpsPilot evals: complaint triage for a dealer service network',
    business: { name: 'Two-wheeler dealer service network (composite)', profile: 'Service centres log customer complaints in free text. A triage model routes them to the right technician team. Wrong routing means a second visit.' },
    data: [{ name: 'NHTSA complaints (from day 11) as stand-in narratives', url: 'https://www.nhtsa.gov/nhtsa-datasets-and-apis', use: 'Label 100 narratives by component for an eval set.' }],
    pain: ['Read service centre reviews mentioning "second visit" or "not fixed".'],
    people: [{ role: 'Head of After-Sales', cares: 'First-time fix rate and cost per triage.', hidden: 'Budget allows about 2 paise of model cost per complaint at their volume.' }],
    ask: ['What does a wrong routing cost?', 'What is your per-complaint budget for automation?'],
    sql: ['Label distribution in your eval set.'],
    value: 'Value = complaints per year x improvement in correct routing x cost of a repeat visit, minus model cost.',
    build: {
      goal: 'An eval harness comparing two models and two prompts on accuracy, cost and latency, with guardrails for invalid output.',
      prompt: `Day 19 of my FDE lab. Add opspilot/agent/eval.

1. eval/routing.jsonl: 100 narratives with the correct component label (I will label them; create the file with 10 examples and the format).
2. run-eval.ts: runs a triage prompt across the set for each configured model (env list of OpenAI-compatible endpoints and models), records per item: predicted label, valid JSON yes or no, latency, input and output tokens, cost from a price table you fill in.
3. Guardrails: JSON schema validation, allowed-label check, one retry, then "needs_human".
4. report.md: accuracy, invalid rate, p50 and p95 latency, cost per 1,000 complaints for each model and prompt, and a recommendation that respects the 2 paise per complaint budget.
5. Wire the chosen model into the triage tool with the same guardrails.`,
    },
    deliver: ['100-item eval set', 'Model and prompt comparison', 'Cost per 1,000 complaints', 'Guardrails in production path'],
    video: `[Face] Day 19. A service network where a wrong routing means a second visit.
[Screen] Two models, two prompts, one hundred labelled complaints. Accuracy, invalid output, latency and cost side by side.
[Screen] The cheaper model was [X] points less accurate and [Y] times cheaper, inside the 2 paise budget.
[Face] Customers buy AI that is measured.`,
    post: `The customer's budget was about 2 paise of AI cost per complaint. That decided the model before accuracy did.

Day 19 of my 30-day FDE lab: evals.

I ran two models and two prompts on 100 labelled complaints and measured:
- Accuracy: [A%] vs [B%]
- Invalid output before guardrails: [C%]
- p95 latency: [D] seconds
- Cost per 1,000 complaints: [E] vs [F]

Then I wired the chosen model in with schema checks, allowed labels and a human fallback.

Tomorrow: deploying it for real.`,
  },
  {
    day: 20, week: 3, focus: 'Build: deploy, secure and observe', domain: 'Public sector · Municipal services',
    title: 'OpsPilot in production: a municipal grievance desk',
    business: { name: 'Municipal corporation grievance desk (composite)', profile: 'Citizens raise grievances online. The pilot from day 10 worked; now it must run in production with logins, monitoring and a rollback plan.' },
    data: [{ name: 'NYC 311 (from day 10) as stand-in grievances', url: 'https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2010-to-Present/erm2-nwe9', use: 'Import one month as workspace "municipal-desk".' }],
    pain: ['Read about outages of government portals and what citizens said.'],
    people: [{ role: 'IT head', cares: 'Uptime, security, who can see what.', hidden: 'Needs role-based access: ward officers see only their ward.' }],
    ask: ['Who needs which access?', 'What is your rollback expectation if a release breaks?'],
    sql: ['None.'],
    value: 'Uptime and safe releases protect the value from day 10.',
    build: {
      goal: 'Deploy core, agent and console with auth, role-based access per workspace and ward, CI, health checks, tracing and a rollback.',
      prompt: `Day 20 of my FDE lab: production. For opspilot:

1. Auth: Spring Security with JWT in core; roles admin, approver, viewer per workspace; a "ward" attribute limits which cases a ward officer sees (filter in the repository layer and test it).
2. Docker: Dockerfiles for core, agent and console; docker-compose.prod.yml with PostgreSQL (pgvector), healthchecks, restart policies and a named volume. No secrets in images; use an env file.
3. CI: GitHub Actions running tests for core and agent, building images and pushing to GHCR on main.
4. Observability: OpenTelemetry in core (Spring) and agent (Node) exporting traces; /health and /ready endpoints; structured JSON logs with a request id.
5. Deploy doc: how to deploy to a single VPS or Google Cloud Run, how to roll back to the previous image tag, and a pre-release backup step for PostgreSQL.
Import the municipal-desk workspace and verify a ward officer sees only their ward.`,
    },
    deliver: ['Live URL', 'Role and ward access tested', 'CI pipeline green', 'Traces visible', 'Rollback documented'],
    video: `[Face] Day 20. The city pilot works; now it goes to production.
[Screen] Logins and roles: this ward officer sees only their ward. CI builds and tests every change.
[Screen] A request traced end to end, and the one-command rollback.
[Face] This is the live URL: [link].`,
    post: `A ward officer logs in and sees only their ward. That one rule took longer than the rest of the deploy.

Day 20 of my 30-day FDE lab: OpsPilot in production.

- Logins and roles per workspace, plus ward-level access, tested
- CI that tests and builds every change
- Health checks, tracing across the Spring core and the Node agent
- A backup before every release and a one-command rollback

Live demo: [link]

Tomorrow: the week three demo, start to finish.`,
  },
  {
    day: 21, week: 3, focus: 'Review: the flagship demo', domain: 'Review',
    title: 'Week 3 review: one platform, six businesses',
    business: { name: 'OpsPilot', profile: 'Six workspaces on one platform: manufacturing, dental, card disputes, D2C, service network, municipal.' },
    data: [{ name: 'Your live OpsPilot', url: '/fde-lab.html', use: 'Demo script below.' }],
    pain: ['Which workspace took longest to onboard, and why?'],
    people: [{ role: 'FDE hiring manager', cares: 'Can you design for reuse and still fit each customer?', hidden: 'Will ask what you would refuse to customise.' }],
    ask: ['What did you build once that every customer used?', 'What did you refuse to customise?'],
    sql: ['Onboarding time per workspace from your notes.'],
    value: 'Time to onboard a workspace, from day 15 to day 20.',
    build: {
      goal: 'A 5-minute demo video and an architecture diagram.',
      prompt: `Week 3 review for opspilot:
1. docs/architecture.md with a Mermaid diagram: console, core (Spring Boot, PostgreSQL with pgvector), agent (Node.js), connectors, LLM endpoint, approvals and audit, and where customer data lives.
2. docs/demo-script.md: a 5-minute demo: onboard a new workspace from CSV, a rule fires, the agent proposes with a policy citation, a human approves, the audit log shows it, a trace shows the request.
3. Update the root README with days 15 to 20 and onboarding time per workspace (from my notes; leave placeholders).`,
    },
    deliver: ['Architecture diagram', '5-minute demo video', 'README week three'],
    video: `[5 min] Onboard a new business live from a CSV. A rule fires. The agent proposes a message citing policy. You approve. The audit log records it. Show the trace. Close with the six workspaces and onboarding time per workspace.`,
    post: `Six businesses on one platform, and the sixth took [X hours] to onboard against [Y hours] for the first.

Week three of my 30-day forward deployed engineer lab: OpsPilot.

- A Spring Boot core: cases, rules, approvals, an audit log nobody can edit
- A Node.js agent that proposes and never acts alone
- Policy retrieval with citations and refusals
- Webhooks, rate limits, evals, roles and tracing

Workspaces: manufacturing, dental, card disputes, D2C, a service network and a municipal desk.

Five-minute demo below. Week four: running a customer implementation end to end.`,
  },
  {
    day: 22, week: 4, focus: 'Lead an implementation: kickoff', domain: 'Hospitality · Resort group',
    title: 'Kickoff with a resort group',
    business: { name: 'Five-resort group, Goa and Kerala (composite)', profile: 'Signed a pilot for cancellation-aware overbooking (day 5). Today is the kickoff call with the GM, revenue manager, IT and finance.' },
    data: [{ name: 'Hotel booking demand (from day 5)', url: 'https://www.kaggle.com/datasets/jessemostipak/hotel-booking-demand', use: 'Baseline numbers for the success criteria.' }],
    pain: ['Read resort reviews mentioning "room not available" on arrival.'],
    people: [
      { role: 'Group GM (executive sponsor)', cares: 'RevPAR before peak season.', hidden: 'Peak season starts in 6 weeks; the pilot must be live in 4.' },
      { role: 'IT manager', cares: 'Not breaking the property management system.', hidden: 'Only nightly exports from the PMS are allowed, no live API.' },
    ],
    ask: ['What is the one number that tells us this worked?', 'Who has authority to change overbooking each night?', 'What would make you stop the pilot?'],
    sql: ['Baseline: last season cancellations and walked guests per resort.'],
    value: 'Success criterion: recovered room nights vs last season baseline, measured weekly.',
    build: {
      goal: 'A kickoff pack: agenda, goals and success metric, RACI, 4-week plan, risks, and the weekly status template.',
      prompt: `Day 22 of my FDE lab: lead an implementation. Create day22-kickoff/ with markdown:
1. agenda.md for a 60-minute kickoff.
2. charter.md: goal, success metric with baseline from the day 5 data, in and out of scope, assumptions (nightly PMS export only).
3. raci.md for: data export, rule configuration, nightly decision, UAT, go-live, rollback.
4. plan.md: 4 weeks with milestones, owners and a go/no-go before peak season.
5. risks.md: top 8 risks with likelihood, impact and mitigation.
6. status-template.md for a weekly one-page update (green, amber, red).
Then create a workspace "resort-group" in OpsPilot with the nightly export mapping.`,
    },
    deliver: ['Kickoff pack', 'RACI', '4-week plan with go/no-go', 'Risk register', 'Workspace configured'],
    video: `[Face] Day 22. Week four is about leading a customer implementation. Today: kickoff with a resort group six weeks before peak season.
[Screen] The charter, the one success metric, the RACI and the four-week plan with a go/no-go.
[Face] The IT manager allowed nightly exports only. Saying that out loud in the kickoff saved a week of building the wrong integration.`,
    post: `Peak season was six weeks away, so the pilot had to be live in four. The kickoff decided whether that was possible.

Day 22 of my 30-day FDE lab: leading a customer implementation, starting with the kickoff.

What I brought to the call:
- One success metric with last season's baseline
- A RACI, including who changes overbooking each night
- A four-week plan with a go/no-go before peak
- A risk register

The IT manager allowed nightly exports only. Hearing that on day one saved a week.

Tomorrow: the customer's data is messier than promised.`,
  },
  {
    day: 23, week: 4, focus: 'Lead an implementation: messy data onboarding', domain: 'Retail · Pharmacy chain',
    title: 'Data onboarding at a pharmacy chain',
    business: { name: 'Regional pharmacy chain (composite)', profile: 'Bought the day 8 forecasting baseline. Their store data arrived in three formats with missing days and store codes that do not match the master list.' },
    data: [{ name: 'Rossmann Store Sales (from day 8), with deliberate damage', url: 'https://www.kaggle.com/c/rossmann-store-sales', use: 'Break it on purpose: drop days, rename stores, mix date formats.' }],
    pain: ['Ask: what share of implementations slip because of data? Find one public post-mortem.'],
    people: [{ role: 'Head of Data', cares: 'Not being blamed for bad data.', hidden: 'The store master list is maintained in a spreadsheet by one person who is on leave.' }],
    ask: ['Who owns the store master list?', 'Which source is the truth when two disagree?', 'Who signs off the data quality report?'],
    sql: ['Missing days per store, unknown store codes, date parse failures, duplicate rows.'],
    value: 'Every week of data delay pushes the payback date by a week; put that in the status update.',
    build: {
      goal: 'A data quality report the customer signs off, and a mapping that fixes what can be fixed and lists what cannot.',
      prompt: `Day 23 of my FDE lab. Build day23-onboarding/.

1. damage.mjs: takes the Rossmann train.csv and writes 3 messy files: different date formats, renamed store codes for 5% of stores, 3% of days dropped, some duplicate rows.
2. dq.sql (DuckDB): checks for parse failures, unknown store codes against store.csv, missing days per store, duplicates; outputs a table of issues with counts and examples.
3. dq-report.md generated by a Node script: summary, each issue with count, example rows, proposed fix, and "customer decision needed" items, plus a sign-off line.
4. mapping.yaml applied by the OpsPilot CSV import (store code aliases, date formats); re-run dq.sql after mapping to show what remains.`,
    },
    deliver: ['Damaged sample files', 'Data quality report with sign-off', 'Mapping applied', 'Before and after issue counts'],
    video: `[Face] Day 23. The customer's data arrived in three formats, with store codes that match nothing.
[Screen] The data quality report: [N] issues, what I fixed with a mapping, and the [M] decisions only the customer can make.
[Face] The sign-off line matters. It turns "your data is bad" into a shared decision.`,
    post: `The customer's store codes matched nothing in their own master list. The person who owned that list was on leave.

Day 23 of my 30-day FDE lab: data onboarding, where implementations slip.

What I delivered:
- A data quality report: [N] issues with counts and examples
- A mapping that fixed [X] of them
- [M] decisions only the customer can make, with a sign-off line

A signed data report turns blame into a shared decision.

Tomorrow: getting people to use it.`,
  },
  {
    day: 24, week: 4, focus: 'Lead an implementation: UAT and adoption', domain: 'Telecom · Broadband provider',
    title: 'UAT and adoption at a broadband provider',
    business: { name: 'Broadband provider (composite)', profile: 'The day 4 retention worklist passed testing, but agents keep using their old spreadsheet. Usage is 30% after two weeks.' },
    data: [{ name: 'Telco Customer Churn (from day 4)', url: 'https://www.kaggle.com/datasets/blastchar/telco-customer-churn', use: 'Simulate two weeks of worklist usage and saves.' }],
    pain: ['Read about change management failures in CRM rollouts.'],
    people: [{ role: 'Retention team lead', cares: 'Her team\'s targets.', hidden: 'The new worklist does not show the save history agents rely on, so they keep the spreadsheet.' }],
    ask: ['What does the old spreadsheet do that the worklist does not?', 'Who are the two agents others copy?'],
    sql: ['Usage per agent per day; saves for agents using the worklist vs not.'],
    value: 'Value only counts if people use it: adoption rate x value per active agent.',
    build: {
      goal: 'A UAT script, an adoption dashboard, and the missing feature (save history) shipped in a day.',
      prompt: `Day 24 of my FDE lab. Build day24-adoption/.
1. uat.md: 12 test cases written with the retention lead, each with steps, expected result, pass or fail, owner.
2. In OpsPilot, add usage events (case_viewed, offer_made, saved) written to the audit log, and a console page: active users per day, cases worked, saves per active user, comparison of worklist users vs spreadsheet users.
3. Add the missing feature: a save-history panel on each case showing previous offers and outcomes.
4. adoption-plan.md: champions, a 20-minute training script, daily office hours for one week, the usage target and what happens if it is missed.`,
    },
    deliver: ['UAT with owners', 'Adoption dashboard', 'Save-history feature shipped', 'Adoption plan'],
    video: `[Face] Day 24. The tool passed testing and nobody used it. Usage was 30%.
[Screen] The adoption dashboard, and the reason: agents needed the save history their spreadsheet had.
[Screen] Shipped in a day. Here is usage the week after: [X%].
[Face] Adoption problems are often a missing feature, found by asking the people who stopped.`,
    post: `Usage was 30% two weeks after go-live. The agents had a reason: the new worklist lacked the save history their spreadsheet had.

Day 24 of my 30-day FDE lab: adoption.

- A UAT script written with the team lead, 12 cases with owners
- An adoption dashboard: active users, cases worked, saves per agent
- The missing save-history panel, shipped in a day
- Usage after the change: [X%]

Asking the people who stopped using it was the fastest fix.

Tomorrow: a deployment fails at the customer.`,
  },
  {
    day: 25, week: 4, focus: 'Lead an implementation: incident and escalation', domain: 'Logistics · 3PL warehouse',
    title: 'A failed release at a 3PL warehouse',
    business: { name: 'Third-party logistics warehouse (composite)', profile: 'Uses the day 9 promise check. A release on Friday evening blocked every First Class order for three hours. The client\'s VP is on the phone.' },
    data: [{ name: 'DataCo orders (from day 9)', url: 'https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis', use: 'Reproduce the bad rule against real orders.' }],
    pain: ['Read two public post-mortems from well-known outages and note their structure.'],
    people: [{ role: 'Client VP Operations', cares: 'Orders shipping and not being surprised again.', hidden: 'Wants a named person and a written commitment, not an apology.' }],
    ask: ['Which orders were affected and what did each cost?', 'What do you need from us in the next hour, day and week?'],
    sql: ['Orders that would have been blocked by the bad rule in a 3-hour window.'],
    value: 'Cost of the incident in the customer\'s numbers; prevention cost vs repeat risk.',
    build: {
      goal: 'Reproduce the bug, fix it with a test, write the incident communication and a blameless post-mortem.',
      prompt: `Day 25 of my FDE lab. In day09-logistics, introduce the bug on a branch: the cutoff hour compares local time with UTC, so after 18:30 IST every First Class order is refused.
1. Write a failing test that reproduces it, then fix it with timezone-aware times, and add a test for the boundary.
2. blocked.sql: count orders the bad rule would have blocked in a 3-hour window.
3. comms.md: the first message to the client within 15 minutes, an update at 1 hour, and the close-out, each short and factual.
4. postmortem.md: timeline, impact in their numbers, root cause, why tests missed it, actions with owners and dates (release freeze on Fridays after 4 pm, canary release, timezone tests).`,
    },
    deliver: ['Bug reproduced and fixed with tests', 'Impact numbers', 'Incident messages', 'Post-mortem with owners'],
    video: `[Face] Day 25. A release blocked every First Class order for three hours, on a Friday evening.
[Screen] The bug: a timezone comparison. The failing test, the fix and the boundary test.
[Screen] The three messages I sent the client, and the post-mortem actions.
[Face] The VP did not want an apology. She wanted a name and a date.`,
    post: `A Friday release blocked every First Class order for three hours. The cause was one timezone comparison.

Day 25 of my 30-day FDE lab: an incident at the customer.

- Reproduced it with a failing test, fixed it, added the boundary test
- Impact in their numbers: [N] orders, [amount]
- Three client messages: at 15 minutes, 1 hour and close-out
- A blameless post-mortem with owners and dates

The client VP asked for a named owner and a date, and that is what the post-mortem gives her.

Tomorrow: proving value at the quarterly review.`,
  },
  {
    day: 26, week: 4, focus: 'Value realisation: the QBR', domain: 'Manufacturing · Paints distributor',
    title: 'Quarterly business review with a paints distributor\'s CFO',
    business: { name: 'Paints distributor (composite)', profile: 'Has used OpsPilot for procure-to-pay exceptions for a quarter (day 1 and day 15). The CFO wants to know if it paid for itself before renewing.' },
    data: [{ name: 'BPI Challenge 2019 (from day 1)', url: 'https://data.4tu.nl/', use: 'Split the log into "before" and "after" periods to simulate the quarter.' }],
    pain: ['Read how SaaS vendors present value at renewal; find one public QBR template.'],
    people: [{ role: 'CFO', cares: 'Was the money worth it, in my numbers?', hidden: 'Is comparing you to an ERP module her IT team says can do the same.' }],
    ask: ['Which numbers do you trust from your own systems?', 'What would make the renewal easy?'],
    sql: ['Cycle time, PO-after-invoice share and exceptions resolved, before vs after.'],
    value: 'Realised value vs the business case from day 1, with the same formula and her confirmed inputs.',
    build: {
      goal: 'A QBR deck outline and a one-page value summary built from the data, plus an honest comparison with the ERP alternative.',
      prompt: `Day 26 of my FDE lab. Build day26-qbr/.
1. before-after.sql: split the BPI log at a date; compute the day 1 metrics for each period.
2. value-summary.md: business case vs realised, same formula, inputs marked "CFO confirmed" or "estimate", and the gap explained.
3. qbr.md: 8-slide outline: goals recap, adoption, value realised, what did not work, roadmap, risks, comparison with the ERP module (where it wins, where we win), renewal and expansion ask.
4. A Node script that fills the numbers in both documents from the SQL output.`,
    },
    deliver: ['Before and after metrics', 'Value summary vs business case', 'QBR outline', 'Honest ERP comparison'],
    video: `[Face] Day 26. A quarter later, the CFO asks whether it paid for itself.
[Screen] Same formula as the business case on day 1, her confirmed numbers: [realised] against [planned].
[Screen] What did not work, and where her ERP module would win.
[Face] Showing where you lose earns the renewal conversation.`,
    post: `The CFO was comparing us to an ERP module her IT team liked. So the review showed exactly where the ERP module wins.

Day 26 of my 30-day FDE lab: the quarterly business review.

- The same value formula as the original business case
- Her confirmed inputs: realised [amount] against [planned]
- What did not work this quarter, in writing
- A side-by-side with the ERP alternative

Value in the customer's own numbers is what renewals are decided on.

Tomorrow: turning one customer into a product decision.`,
  },
  {
    day: 27, week: 4, focus: 'Expansion and the product feedback loop', domain: 'Agriculture · Agri-input retailer',
    title: 'Expansion at an agri-input retailer and feedback to product',
    business: { name: 'Agri-input retail chain, Vidarbha (composite)', profile: 'Uses the day 13 price alerts for farmers. Now asks for stock alerts on seeds and fertiliser before sowing season. Two other customers asked for something similar.' },
    data: [{ name: 'AGMARKNET (from day 13)', url: 'https://www.data.gov.in/', use: 'Price context for the expansion case.' }],
    pain: ['Read news on fertiliser shortages before sowing season.'],
    people: [{ role: 'Retail chain owner', cares: 'Not running out of the right seed in the first week of sowing.', hidden: 'Will pay for stock alerts only if they work in Marathi over WhatsApp, like the price alerts.' }],
    ask: ['What did running out cost you last season?', 'Who else in your network has this problem?'],
    sql: ['None, or demand by week from their sales export if you build a sample.'],
    value: 'Expansion value = lost sales from stock-outs avoided; product value = number of customers asking.',
    build: {
      goal: 'An expansion proposal for the customer and a product feedback document for the platform team, plus a generic "threshold alert" feature.',
      prompt: `Day 27 of my FDE lab.
1. day27-expansion/proposal.md: the stock-alert use case, scope, success metric, price, timeline.
2. day27-expansion/product-feedback.md: the request in the product team's format: problem, customers asking (3, with their words), workaround today, proposed generic feature, what not to build, effort guess.
3. In OpsPilot, build the generic feature: "threshold alerts" per workspace (field, comparison, threshold, channel template), reusing the approvals flow, so the price alert and the stock alert are both configuration, not code.`,
    },
    deliver: ['Expansion proposal', 'Product feedback doc', 'Generic threshold alerts in OpsPilot'],
    video: `[Face] Day 27. A customer asked for a new feature. Two others had asked for something similar.
[Screen] The expansion proposal for the customer, and the product feedback I would send the platform team.
[Screen] Built as configuration: the price alert and the stock alert are now the same feature.
[Face] Forward deployed engineers are how a product hears its customers.`,
    post: `Three customers asked for three different alerts. I built one feature that covers all three.

Day 27 of my 30-day FDE lab: expansion and product feedback.

- An expansion proposal for an agri-input retailer: stock alerts before sowing season
- A product feedback note: the problem, three customers in their own words, what not to build
- Generic threshold alerts in OpsPilot, so price and stock alerts are configuration

Carrying patterns back to the product is a core part of a forward deployed engineer's job.

Tomorrow: the reference architecture and security review.`,
  },
  {
    day: 28, week: 4, focus: 'Solutions architecture: reference design and security', domain: 'Cross-industry',
    title: 'Reference architecture and security review for OpsPilot',
    business: { name: 'An enterprise prospect\'s architecture board (composite)', profile: 'A large company wants OpsPilot across three countries. Their architecture board asks for a reference architecture, deployment options and a security review.' },
    data: [{ name: 'Your OpsPilot repo', url: '/fde-lab.html', use: 'Everything built in weeks 3 and 4.' }],
    pain: ['Read one public cloud reference architecture document and copy its structure.'],
    people: [{ role: 'Enterprise architect', cares: 'Fit with their standards, data residency, scale.', hidden: 'EU data must stay in the EU, India data in India (DPDP Act); they want single-tenant for the EU.' }],
    ask: ['Which deployment models do you accept?', 'Where must each country\'s data live?', 'What scale do you expect in year one?'],
    sql: ['None.'],
    value: 'Architecture choices priced: shared vs single-tenant cost per year.',
    build: {
      goal: 'A reference architecture document with deployment options, data residency, a threat model and scaling notes.',
      prompt: `Day 28 of my FDE lab. Create opspilot/docs/reference-architecture.md:
1. Context and components (Mermaid).
2. Deployment options: multi-tenant SaaS, single-tenant per region, customer VPC, with trade-offs and rough monthly cost for each.
3. Data residency: EU and India placements, what crosses borders (nothing by default), model endpoint choices per region including self-hosted.
4. Security: STRIDE threat model table, controls already built (auth, roles, ward filters, audit log, signed webhooks, rate limits), gaps with dates.
5. Scale: expected load in year one, bottlenecks, how each tier scales.
6. Decision record for the EU single-tenant choice.
Keep it to what OpsPilot actually does; mark planned items clearly.`,
    },
    deliver: ['Reference architecture', 'Deployment options with cost', 'Data residency plan', 'Threat model'],
    video: `[Face] Day 28: the solutions architect day. An enterprise wants this in three countries.
[Screen] Three deployment options with cost, where each country's data lives, and the threat model.
[Face] Everything marked planned is planned with a date. Architecture boards notice honesty.`,
    post: `The architecture board had one non-negotiable: EU data stays in the EU and India data stays in India.

Day 28 of my 30-day FDE lab: solutions architecture.

For an enterprise wanting OpsPilot in three countries:
- Three deployment options with rough monthly cost
- A data residency plan, including model endpoints per region
- A threat model with what is built and what is planned, with dates
- A decision record for single-tenant in the EU

Two days left. Tomorrow: packaging it all.`,
  },
  {
    day: 29, week: 4, focus: 'Portfolio and interview readiness', domain: 'Career',
    title: 'Package the lab and rehearse the FDE interview',
    business: { name: 'You', profile: 'Turn 28 days into a portfolio a hiring manager can scan in 2 minutes, and practise telling it.' },
    data: [{ name: 'Your lab repo and notes', url: '/fde-lab.html', use: 'Everything so far.' }],
    pain: ['What would a hiring manager doubt first?'],
    people: [{ role: 'FDE hiring manager', cares: 'Discovery, judgement, shipping, customer handling.', hidden: 'Will pick one day and go deep on what you would do differently.' }],
    ask: ['Which three days best show judgement?', 'Which day would you redo, and how?'],
    sql: ['None.'],
    value: 'One table: 28 businesses, the constraint found, the value estimated.',
    build: {
      goal: 'A portfolio page, a resume project entry, and a mock FDE interview in the Interview Room.',
      prompt: `Day 29 of my FDE lab.
1. Create portfolio/index.html: a single page with a one-line intro, the 30-day table (day, industry, problem, constraint found, build, link), the OpsPilot architecture image, links to the 3 weekly videos and the demo. Plain, fast, no frameworks.
2. Write a resume project entry for "FDE Lab and OpsPilot" in 4 bullets using only real outcomes from the READMEs, with [placeholders] for numbers I have not filled.
3. Write 6 interview stories (situation, what I asked, what I found, what I built, result, what I would do differently) from days 1, 6, 10, 16, 24 and 25.`,
    },
    deliver: ['Portfolio page live', 'Resume project entry', '6 interview stories', 'Mock FDE interview done'],
    video: `[Face] Day 29. Twenty-eight businesses on one page.
[Screen] The portfolio: each day's constraint, build and link. The platform underneath.
[Face] Then a mock forward deployed engineer interview. The question I found hardest: [question].`,
    post: `Twenty-eight businesses, twenty-eight hidden constraints, one page.

Day 29 of my 30-day FDE lab: packaging it.

- A portfolio page with every day's problem, constraint, build and link
- OpsPilot's architecture and demo
- Six interview stories, including the incident on day 25

Then a mock forward deployed engineer interview. The hardest question was [question], and my answer is [answer].

Tomorrow: the full story in one video.`,
  },
  {
    day: 30, week: 4, focus: 'Launch: the 0 to 1 story', domain: 'Launch',
    title: 'The 30-day story, the launch post and outreach',
    business: { name: 'You', profile: 'Tell the whole story once, well, and send it to the people who hire forward deployed engineers and solutions architects.' },
    data: [{ name: 'Everything', url: '/fde-lab.html', use: 'Videos, repo, portfolio.' }],
    pain: ['Who should see this first?'],
    people: [{ role: 'Hiring managers for FDE and AI solutions architect roles', cares: 'Proof over claims.', hidden: 'Read the first two lines and the first 20 seconds of video only.' }],
    ask: ['Which single moment from the 30 days should open the video?'],
    sql: ['None.'],
    value: 'Count: interviews or conversations started from this in the next 2 weeks.',
    build: {
      goal: 'A 6 to 8 minute video, the launch post, and 20 personal messages to hiring managers.',
      prompt: `Day 30 of my FDE lab.
1. video-outline.md for a 6 to 8 minute video: open with the strongest moment (from my notes), then discovery, value, procurement, platform, implementation, incident, what I learned. Mark where to cut to screen.
2. A short message template to a hiring manager for FDE or AI solutions architect roles: one line about their company's product, one line about one lab day that matches their customers, the portfolio link, a 15-minute ask. Leave [specific] placeholders; no generic praise.
3. Update the root README with day 30 and a "Start here" section linking the portfolio, the demo and the three best days.`,
    },
    deliver: ['6 to 8 minute video', 'Launch post', '20 personal messages sent', 'Logged in Career Copilot outreach'],
    video: `[6 to 8 min] Open on the strongest moment. Then: why this lab, discovery patterns, value and procurement, OpsPilot, the implementation weeks, the Friday incident, what changed in how you work. Close with the portfolio link.`,
    post: `Thirty days, thirty business problems, and the most useful thing I learned came from the hidden constraints.

I ran a 30-day lab to practise forward deployed engineering in public. Every day: a real dataset or complaint source, a discovery call with a C-level role-play, a value estimate and a build.

What came out of it:
- OpsPilot, one platform running [N] businesses as workspaces
- Discovery notes from 30 industries
- A procurement pack, a kickoff pack, a post-mortem and a QBR

[Your one-line lesson.]

Full story in the video. Portfolio: [link]`,
  },
);
