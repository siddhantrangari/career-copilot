/**
 * FDE Lab — 30-day curriculum, days 1–15, plus the method every day follows.
 *
 * Each day is a different business built on a real public dataset or a real
 * public complaint source. The businesses are composites (marked as such) so
 * nothing impersonates a real company; the data and pain points are real.
 * LinkedIn drafts follow his rules: no em dashes, no emojis, no banned
 * phrases, and [brackets] wherever only his real result can go.
 */
window.FDE_LAB = {
  method: {
    loop: [
      { min: 15, step: 'context', label: 'Context and real data', what: 'Read the business brief, open the dataset, skim 20 real complaints or reviews. Write 3 lines: who hurts, how often, what it costs.' },
      { min: 20, step: 'discovery', label: 'Discovery call (role-play)', what: 'Run the C-level call in the Interview Room (button below). Ask before you build. Find the metric, its owner, the hidden constraint.' },
      { min: 20, step: 'value', label: 'Problem framing and value', what: 'Run the SQL ideas in DuckDB, then the value prompt. One-sentence problem, one success metric, a rough ROI from the data.' },
      { min: 45, step: 'build', label: 'Build the slice', what: 'Paste the build prompt into Claude Code. Ship the smallest thing that proves the value. Commit and push.' },
      { min: 10, step: 'video', label: 'Record the video', what: '60 to 90 seconds, screen plus face. Use the script, then say it in your own words.' },
      { min: 10, step: 'post', label: 'Post on LinkedIn', what: 'Fill the [brackets] with your real numbers, attach the video, post. Paste the post link here.' },
    ],
    discovery: [
      'Walk me through what happens today, step by step, the last time this went wrong.',
      'Which number gets worse when this breaks, and who is measured on it?',
      'What does one bad case cost you, in money or hours?',
      'What have you already tried, and why did it not stick?',
      'Where does the data live, and who can give me access this week?',
      'Who else has to say yes: IT, security, finance, legal?',
      'If we fixed this, what would be different in 30 days?',
    ],
    value: 'Value per year = (volume per year x time saved per case x loaded cost per hour) + (errors avoided per year x cost per error) + (revenue recovered). Always say "rough, from your numbers" and get the customer to confirm each input.',
    procure: [
      'Champion and economic buyer identified (who uses it vs who pays).',
      'Security review: SIG Lite or CAIQ questionnaire, data flow diagram, where data is stored, who can see it, retention.',
      'Legal: MSA, DPA (India DPDP Act 2023, GDPR if EU data), SOW with scope, milestones and acceptance criteria.',
      'Commercials: pilot price, success criteria that convert the pilot, annual price, payment terms.',
      'Procurement: vendor onboarding form, PO, invoicing details. Expect 2 to 8 weeks; start it on day one of the pilot.',
    ],
    implement: [
      'Kickoff: goals, success metric, RACI, timeline, risks, weekly cadence.',
      'Data onboarding: access, mapping, data quality report signed off by the customer.',
      'Build and configure in weekly increments, each shown to the users.',
      'UAT with real users and real cases; fix list with owners.',
      'Go-live with rollback plan, monitoring and a named on-call.',
      'Adoption: training, usage metric per week, office hours.',
      'Value review (QBR): baseline vs now, in their numbers. Then expansion.',
    ],
    platform: 'OpsPilot, the reusable platform you build in week 3: a Spring Boot core (workspaces, cases, rules, approvals, append-only audit log, CSV and REST connectors, PostgreSQL), a Node.js TypeScript agent worker (LLM tool calling against the core API, RAG over SOPs, human approval before any action), and a React console. Every business from weeks 1 and 2 becomes a workspace in it, which proves the pattern is reusable.',
    tools: 'DuckDB CLI for SQL on CSV and Parquet (no Python needed). Claude Code for the build. Any OpenAI-compatible LLM endpoint you already use (DeepInfra, Groq, Together AI). Loom or OBS for video. GitHub repo: opspilot.',
    realTalks: 'Optional, never a blocker: once a week, message 5 operations or finance leaders on LinkedIn: "I am running a 30-day lab solving real operations problems with AI, one industry a day. This week is [domain]. Could I ask you 3 questions for 15 minutes about how [process] works in your team? I will share the write-up with you first." Use any call you get as that day\'s discovery instead of the role-play.',
  },
  days: [],
};

window.FDE_LAB.days.push(
  {
    day: 1, week: 1, focus: 'Discovery: process problems hide in event logs', domain: 'Manufacturing · Procure-to-pay',
    title: 'Late supplier payments at a coatings manufacturer',
    business: { name: 'Coatings manufacturer (composite)', profile: 'Multinational paints and coatings maker. Thousands of purchase orders a month, three-way match between PO, goods receipt and invoice. Finance says suppliers are paid late and early-payment discounts are lost.' },
    data: [
      { name: 'BPI Challenge 2019: real purchase-to-pay event log from a multinational coatings company', url: 'https://data.4tu.nl/', use: 'Search "BPI Challenge 2019" on 4TU.ResearchData. Each row is an event on a purchase order item: create PO, goods receipt, invoice, clear invoice, changes.' },
    ],
    pain: ['Search r/Accounting and r/sysadmin for "three way match" and "invoice approval delay".', 'Read 10 G2 reviews of AP automation tools: what buyers complain about before they bought.'],
    people: [
      { role: 'CFO', cares: 'Days payable outstanding, lost early-payment discounts, audit findings.', hidden: 'Invoices are only cleared in a weekly batch run, so nothing can be faster than 7 days without IT changing the job.' },
      { role: 'Head of Procurement', cares: 'Supplier relationships, maverick buying (invoice before PO).', hidden: 'A third of POs are created after the invoice arrives.' },
    ],
    ask: ['Which suppliers complain most, and what do they say?', 'What share of invoices fail the three-way match the first time?', 'When the match fails, who fixes it and how do they find out?'],
    sql: ['Count events per activity and the median days between "Create Purchase Order Item" and "Clear Invoice".', 'Find cases where "Record Invoice Receipt" happens before "Create Purchase Order Item" (PO after invoice).', 'Top 10 vendors by median cycle time.'],
    value: 'Lost discount = invoices per year x share eligible for 2% early-payment discount x average invoice value x 2% x share currently paid late.',
    build: {
      goal: 'A DuckDB process-mining script and a one-page findings report (HTML) that shows cycle time, the PO-after-invoice share and the slowest vendors.',
      prompt: `You are helping me, a forward deployed engineer, on day 1 of a 30-day lab. Build a small, runnable analysis in a new folder day01-p2p/.

Data: the BPI Challenge 2019 event log exported to CSV (columns include case id, activity, timestamp, vendor, item type). I will place it at day01-p2p/data/bpi2019.csv. If the column names differ, inspect the header first and adapt.

Build:
1. queries.sql for the DuckDB CLI that computes: events per activity; median and p90 days from "Create Purchase Order Item" to "Clear Invoice" per case; share of cases where "Record Invoice Receipt" comes before "Create Purchase Order Item"; top 10 vendors by median cycle time (min 50 cases).
2. A Node.js script report.mjs that runs those queries through the duckdb npm package and writes report.html: three headline numbers at the top, then two tables, plain readable CSS, no frameworks.
3. README.md: what the data is, how to run it (two commands), and the three findings in one line each with [placeholders] for the numbers.

Constraints: no Python. Handle timestamps carefully (parse with strptime if needed). Keep it under 200 lines total. Show me the commands to run at the end.`,
    },
    deliver: ['report.html with 3 headline numbers', 'Problem statement in one sentence', 'Rough value of lost discounts', 'Repo folder day01-p2p pushed'],
    video: `[Face, 10s] Day 1 of 30. Every day I take a real business problem and work it like a forward deployed engineer. Today: a coatings manufacturer that pays suppliers late.
[Screen, 30s] This is a real purchase-to-pay event log. Here is the median time from purchase order to paid invoice: [X days]. And [Y%] of orders were created after the invoice arrived.
[Screen, 20s] In the discovery call the CFO told me the real constraint: invoices clear in a weekly batch. So the fix starts with the process, then the software.
[Face, 10s] Tomorrow, a clinic chain losing money to no-shows.`,
    post: `[Y%] of purchase orders at a coatings company were raised after the invoice arrived.

I found it in a real event log on day 1 of my 30-day lab.

Every day for 30 days I'm taking one real business problem and working it like a forward deployed engineer: discovery with the C-level, the data, the value, a working build.

Day 1 was procure-to-pay:
- Median PO to payment: [X days]
- Slowest vendor group: [name] at [Z days]
- Lost early-payment discount, rough: [amount] a year

The CFO role-play gave me the part the data hid. Invoices only clear in a weekly batch, so no tool can beat 7 days until that job changes.

Video below. Tomorrow: a clinic chain and patient no-shows.`,
  },
  {
    day: 2, week: 1, focus: 'Discovery: find the metric and its owner', domain: 'Healthcare · Outpatient clinics',
    title: 'Patient no-shows at a multi-clinic group',
    business: { name: '30-clinic outpatient group (composite)', profile: 'Public-health outpatient clinics. Patients book days or weeks ahead; about one in five does not turn up. Doctors sit idle while waiting lists grow.' },
    data: [
      { name: 'Medical Appointment No Shows (about 110k real appointments, Brazil)', url: 'https://www.kaggle.com/datasets/joniarroba/noshowappointments', use: 'Scheduled day, appointment day, age, neighbourhood, SMS received, no-show flag.' },
    ],
    pain: ['Search Google reviews of clinics for "waited", "appointment cancelled", "no slot".', 'Read r/medicine threads on no-show policies and overbooking.'],
    people: [
      { role: 'COO', cares: 'Doctor utilisation, waiting-list length, cost per visit.', hidden: 'SMS reminders exist but go out only once, the day before, from a system nobody owns.' },
      { role: 'Medical Director', cares: 'Patient outcomes; does not want overbooking that makes doctors run late.', hidden: 'Will reject anything that looks like denying care to likely no-shows.' },
    ],
    ask: ['What does an empty slot cost you?', 'Who calls patients today, and how many can they call a day?', 'What would the medical director never accept?'],
    sql: ['No-show rate by lead time bucket (same day, 1 to 3, 4 to 14, 15+ days).', 'No-show rate with vs without SMS, within the same lead-time bucket.', 'Top neighbourhoods by no-show rate (min 500 appointments).'],
    value: 'Recovered visits = appointments per year x no-show rate x share prevented by targeted reminders and backfill x revenue or cost per visit.',
    build: {
      goal: 'A risk-ranked call list: each tomorrow appointment scored with simple, explainable rules, plus the reminder message.',
      prompt: `Day 2 of my FDE lab. Build day02-noshow/ with no Python.

Data: KaggleV2-May-2016.csv (Medical Appointment No Shows) at day02-noshow/data/. Inspect the header first.

Build:
1. analysis.sql (DuckDB) with no-show rate by lead-time bucket, by SMS received within each bucket, and by age band.
2. A small Spring Boot 3 app (Java 21, Maven) with one endpoint GET /calllist?date=YYYY-MM-DD that reads the CSV, scores each appointment with transparent rules derived from the analysis (lead time, age band, neighbourhood rate, previous no-show if available) and returns the top 50 with a "reason" string per patient. No ML model: rules a medical director can read.
3. A static index.html that calls the endpoint and shows the list with the reasons.
4. README: findings with [placeholders], how to run, and why rules beat a black-box model for this customer.

Keep it small and runnable with mvn spring-boot:run.`,
    },
    deliver: ['No-show rate by lead time', 'Call list with readable reasons', 'Value of recovered visits', 'Repo folder day02-noshow pushed'],
    video: `[Face] Day 2. A clinic group where one in five patients does not show up.
[Screen] Same data, real appointments. No-shows jump from [A%] for same-day bookings to [B%] when booked over two weeks ahead.
[Screen] So I built a call list for tomorrow: who to call first and why, in rules a medical director can read.
[Face] The COO's real problem was ownership. Reminders existed; nobody owned them.`,
    post: `Patients booked two weeks out missed [B%] of appointments. Same-day bookings missed [A%].

Day 2 of my 30-day lab: a clinic group losing doctor time to no-shows.

What I did in 2 hours:
- Analysed about 110k real appointments
- Built a ranked call list for tomorrow with a reason for every patient
- Kept it to plain rules, because the medical director has to trust it

The most useful moment came in discovery. Reminders already existed, sent once, by a system nobody owned. The fix starts with an owner.

Rough value if the team calls the top 50 each day: [amount] in recovered visits a year.

Day 3 tomorrow: an e-commerce marketplace and late deliveries.`,
  },
  {
    day: 3, week: 1, focus: 'Discovery: connect operations data to the customer voice', domain: 'E-commerce · Marketplace',
    title: 'Late deliveries and 1-star reviews at a marketplace',
    business: { name: 'Online marketplace (composite)', profile: 'Marketplace connecting small sellers to buyers across a large country. Sellers ship through carriers. Review scores fall and support tickets rise when orders arrive late.' },
    data: [
      { name: 'Olist Brazilian E-Commerce (about 100k real orders with reviews)', url: 'https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce', use: 'Orders, items, sellers, customers, delivery dates (estimated vs actual) and review scores with text.' },
    ],
    pain: ['Read 30 one-star review comments in the dataset itself (they are in Portuguese; translate a few).', 'Search seller forums for "late delivery penalty" and "carrier delay".'],
    people: [
      { role: 'CEO', cares: 'Repeat purchase rate and marketplace rating.', hidden: 'Sellers pick their own carrier; the marketplace cannot force a carrier change without a contract change.' },
      { role: 'Head of Seller Operations', cares: 'Seller performance scorecards.', hidden: 'Has a list of the worst sellers but no data to defend removing them.' },
    ],
    ask: ['How much does a one-star review cost you in repeat purchases?', 'Can you act on sellers, carriers or both?', 'What does a seller scorecard look like today?'],
    sql: ['Share of orders delivered after the estimated date, by state.', 'Average review score for on-time vs late orders.', 'Sellers with at least 30 orders ranked by late share.'],
    value: 'Value = late orders per year x drop in repeat-purchase rate for late orders x average order value x orders per repeat customer.',
    build: {
      goal: 'A seller late-delivery scorecard and an LLM summary of what one-star reviews say, grouped by theme.',
      prompt: `Day 3 of my FDE lab. Build day03-marketplace/.

Data: Olist CSVs at day03-marketplace/data/ (orders, order_items, sellers, order_reviews).

Build:
1. scorecard.sql (DuckDB): per seller with 30+ orders, order count, late share (delivered after estimated), average review score, average days late.
2. A Node.js TypeScript script themes.ts that takes 300 one-star review comments, sends them in batches to an OpenAI-compatible chat API (base URL and key from env LLM_BASE_URL, LLM_API_KEY, model from LLM_MODEL), asks for JSON {theme, count, example} with themes like late delivery, wrong item, damaged, no response, and merges the batches. Validate the JSON and retry once on a parse failure.
3. scorecard.html showing the seller table and the top review themes.
4. README with findings in [placeholders].

No Python. Print the commands to run.`,
    },
    deliver: ['Seller scorecard', 'Review themes with counts', 'Late vs on-time review score gap', 'Repo folder day03-marketplace pushed'],
    video: `[Face] Day 3. A marketplace where late deliveries turn into one-star reviews.
[Screen] On-time orders average [X] stars. Late ones, [Y]. Here are the sellers driving most of it.
[Screen] And here is what the one-star reviews say, grouped by an LLM in a few seconds.
[Face] Discovery twist: the marketplace cannot change carriers without changing seller contracts.`,
    post: `Late orders on a real marketplace averaged [Y] stars. On-time orders averaged [X].

Day 3 of 30: one business problem a day, worked like a forward deployed engineer.

What I built:
- A seller scorecard from about 100k orders
- An LLM pass over one-star reviews, grouped into themes with counts
- A shortlist of [N] sellers behind [Z%] of late orders

The CEO role-play changed the plan. Sellers choose their own carrier, so the first move is a contract conversation with data behind it, then software.

Tomorrow: a telecom operator and customers who leave.`,
  },
  {
    day: 4, week: 1, focus: 'Discovery: separate the symptom from the cause', domain: 'Telecom · Retention',
    title: 'Customer churn at a telecom operator',
    business: { name: 'Regional telecom operator (composite)', profile: 'Home internet and phone plans. Month-to-month customers leave after price rises or bad support. The retention team calls customers only after they ask to cancel.' },
    data: [
      { name: 'Telco Customer Churn (IBM sample, 7,043 customers)', url: 'https://www.kaggle.com/datasets/blastchar/telco-customer-churn', use: 'Contract type, tenure, services, monthly charges, payment method, churn flag.' },
    ],
    pain: ['Search r/HomeNetworking and consumer forums for "cancel internet" and "price increase".', 'Read telecom app store reviews mentioning support wait times.'],
    people: [
      { role: 'CMO', cares: 'Churn rate and customer lifetime value.', hidden: 'Wants a churn model, but the retention team has only 4 people and can make 120 calls a day.' },
      { role: 'Head of Customer Care', cares: 'Call handling time and first-contact resolution.', hidden: 'Tech support tickets are in a separate system no one has joined to billing.' },
    ],
    ask: ['How many saves can the team make a week, at most?', 'What offer can an agent give without approval?', 'Which customers do you not want to keep?'],
    sql: ['Churn rate by contract type and tenure band.', 'Churn for electronic check vs automatic payment, within month-to-month.', 'Monthly revenue at risk from month-to-month customers in their first 12 months.'],
    value: 'Saved revenue = customers flagged per month x save rate x monthly charge x expected extra months kept, capped by team capacity.',
    build: {
      goal: 'A weekly retention worklist capped at team capacity, with a suggested offer and talking points per customer.',
      prompt: `Day 4 of my FDE lab. Build day04-churn/.

Data: WA_Fn-UseC_-Telco-Customer-Churn.csv at day04-churn/data/.

Build:
1. segments.sql (DuckDB): churn by contract, tenure band, payment method and internet service.
2. A Spring Boot 3 endpoint GET /worklist?capacity=120 that ranks non-churned customers by simple risk rules from the analysis and returns at most "capacity" rows with: customer id, risk reasons, monthly charge, suggested offer from a small rules table (offers.json: contract upgrade discount, autopay switch credit, tech visit).
3. A Node.js TypeScript script talkpoints.ts that, for one customer row, calls an OpenAI-compatible LLM (env LLM_BASE_URL, LLM_API_KEY, LLM_MODEL) to write 3 short talking points for the agent, using only the fields given. Refuse to invent facts.
4. README with findings in [placeholders] and why capacity matters more than model accuracy here.`,
    },
    deliver: ['Churn segments', 'Capacity-capped worklist', 'Talking points sample', 'Repo folder day04-churn pushed'],
    video: `[Face] Day 4. A telecom operator losing month-to-month customers.
[Screen] Month-to-month churn is [X%]; two-year contracts, [Y%]. Paying by electronic check is the other red flag.
[Screen] The team can make 120 calls a day, so I built a worklist capped at exactly that, with an offer and talking points per customer.
[Face] The model was never the bottleneck. The team's capacity was.`,
    post: `The retention team could make 120 calls a day. Every churn model I have seen ignores that number.

Day 4 of my 30-day FDE lab: churn at a telecom operator, real sample data of 7,043 customers.

Findings:
- Month-to-month customers churned at [X%], two-year contracts at [Y%]
- Electronic check payers churned at [Z%]
- Revenue at risk in the first year of tenure: [amount] a month

So I built a weekly worklist capped at team capacity, with an offer and talking points per customer.

Tomorrow: a hotel group and last-minute cancellations.`,
  },
  {
    day: 5, week: 1, focus: 'Discovery: who owns the policy vs who owns the pain', domain: 'Hospitality · Revenue management',
    title: 'Booking cancellations at a hotel group',
    business: { name: 'Two-property hotel group (composite)', profile: 'A city hotel and a resort hotel. High cancellation rates on online bookings leave rooms empty at short notice. Revenue management overbooks by gut feel.' },
    data: [
      { name: 'Hotel booking demand (about 119k real bookings, two hotels in Portugal)', url: 'https://www.kaggle.com/datasets/jessemostipak/hotel-booking-demand', use: 'Lead time, channel, deposit type, ADR, previous cancellations, cancellation flag.' },
    ],
    pain: ['Read hotel reviews mentioning "overbooked" or "moved to another hotel".', 'Search hospitality forums for "OTA cancellations" and "deposit policy".'],
    people: [
      { role: 'General Manager', cares: 'RevPAR and guest reviews.', hidden: 'The OTA contract forbids requiring deposits on its bookings.' },
      { role: 'Revenue Manager', cares: 'Occupancy forecast accuracy.', hidden: 'Overbooks a flat 10% every night regardless of the booking mix.' },
    ],
    ask: ['What does one walked guest cost you?', 'Which channels can you change policy on?', 'How do you decide how many rooms to overbook tonight?'],
    sql: ['Cancellation rate by hotel, channel and deposit type.', 'Cancellation rate by lead time bucket.', 'Nightly expected cancellations vs the flat 10% overbooking (sum of cancellation probability by arrival date).'],
    value: 'Value = room nights recovered per year x ADR, minus walked guests x cost per walk.',
    build: {
      goal: 'A nightly overbooking recommendation per hotel based on the actual booking mix instead of a flat 10%.',
      prompt: `Day 5 of my FDE lab. Build day05-hotel/.

Data: hotel_bookings.csv at day05-hotel/data/.

Build:
1. rates.sql (DuckDB): cancellation rate by hotel x market segment x deposit type x lead-time bucket, with counts. Keep cells with 100+ bookings.
2. A Node.js TypeScript service (Fastify) with GET /overbook?hotel=City%20Hotel&date=YYYY-MM-DD that sums expected cancellations for bookings arriving that date using the rate table, and returns the recommended overbooking count, the flat 10% number, and the difference, with the top 3 contributing segments.
3. A small React (Vite) page with a date picker and the comparison.
4. README with findings in [placeholders] and the policy question for the GM (OTA deposit rules).`,
    },
    deliver: ['Cancellation rates by segment', 'Nightly overbooking recommendation', 'Comparison vs flat 10%', 'Repo folder day05-hotel pushed'],
    video: `[Face] Day 5. A hotel group losing rooms to last-minute cancellations.
[Screen] Online travel agency bookings cancel at [X%], direct bookings at [Y%].
[Screen] So instead of overbooking a flat 10%, this page recommends tonight's number from tonight's booking mix.
[Face] The GM's constraint: the OTA contract forbids deposits. Policy and software have to move together.`,
    post: `Online travel agency bookings cancelled at [X%]. Direct bookings at [Y%]. The hotel overbooked a flat 10% for both.

Day 5 of my 30-day FDE lab, on about 119k real hotel bookings.

What I built:
- Cancellation rates by channel, deposit type and lead time
- A nightly overbooking number per hotel from that night's booking mix
- A comparison against the flat 10%: [N] room nights a year recovered, rough

Discovery mattered most. The OTA contract blocks deposits, so the GM needs a commercial conversation as well as a tool.

Two more days in week one. Tomorrow: a bank and its complaint backlog.`,
  },
  {
    day: 6, week: 1, focus: 'Discovery with regulated customers', domain: 'Banking · Complaints',
    title: 'Complaint backlog at a retail bank',
    business: { name: 'Mid-size retail bank (composite)', profile: 'Credit cards, loans and accounts. Complaints arrive by web, email and regulator portal. Responses must be timely and consistent; late or inconsistent replies draw regulator attention.' },
    data: [
      { name: 'CFPB Consumer Complaint Database (millions of real complaints, public API)', url: 'https://www.consumerfinance.gov/data-research/consumer-complaints/', use: 'Product, issue, company response, timely response flag, consumer narrative (where consented).' },
    ],
    pain: ['Read 30 consumer narratives for one product (credit card).', 'Note which issues get "Closed with explanation" vs "Closed with monetary relief".'],
    people: [
      { role: 'Chief Risk Officer', cares: 'Regulatory findings and repeat issues.', hidden: 'No customer data may be sent to an external LLM without a signed DPA and data residency in-country.' },
      { role: 'Head of Customer Service', cares: 'Backlog and time to respond.', hidden: 'Agents copy old replies from a shared folder, so answers drift from current policy.' },
    ],
    ask: ['Which complaint types repeat most, and do they share a root cause?', 'What is your response-time commitment?', 'What can never leave your environment?'],
    sql: ['Top 10 issues for credit cards in the last 2 years.', 'Share of untimely responses by company size bucket.', 'Issues most often closed with monetary relief.'],
    value: 'Value = complaints per year x minutes saved per response x loaded cost per minute + avoided regulatory cost of repeat issues (ask the CRO for their number).',
    build: {
      goal: 'A complaint triage that tags issue and urgency and drafts a reply grounded in a policy snippet, designed to run on a self-hosted or in-region model.',
      prompt: `Day 6 of my FDE lab. Build day06-complaints/.

Data: download 1,000 credit card complaints with narratives from the CFPB API as JSON into day06-complaints/data/.

Build:
1. issues.sql (DuckDB over the JSON): counts by issue, sub-issue and company response.
2. A Node.js TypeScript worker triage.ts that for each complaint calls an OpenAI-compatible LLM (env LLM_BASE_URL so it can point at a self-hosted Ollama or an in-region endpoint) and returns validated JSON: {issue, urgency: low|medium|high, needs_human: boolean, reason}. Reject and retry once if the JSON is invalid. Never send fields other than the narrative and product.
3. policies/ with 5 short markdown policy snippets you write (dispute timelines, fee reversal, fraud claims). A draft-reply step that picks the matching snippet by keyword and asks the LLM to reply citing only that snippet.
4. README: findings in [placeholders], and a short data-handling note for the CRO (what is sent where, retention, how to run fully on-prem).`,
    },
    deliver: ['Issue counts', 'Triage JSON for 50 complaints', 'Draft replies citing policy', 'Data-handling note for the CRO', 'Repo folder day06-complaints pushed'],
    video: `[Face] Day 6. A bank with a complaint backlog and a regulator watching.
[Screen] Real complaints: the top issue for credit cards is [issue]. [X%] of complaints on it end in monetary relief.
[Screen] This worker tags urgency and drafts a reply that cites only the bank's policy, and it can run on a model inside the bank's network.
[Face] The CRO's rule set the architecture: no customer data leaves without a DPA.`,
    post: `The bank's risk officer had one rule for my AI design: no customer data leaves the country without a signed DPA.

Day 6 of my 30-day lab, working real complaint data from the CFPB database.

What I built:
- Issue counts across [N] credit card complaints
- A triage worker that tags urgency and flags cases for a human
- Draft replies that cite only the bank's policy text
- One config change to run it on a self-hosted model

The rule changed the design before I wrote any code, which is how it should go in regulated work.

Tomorrow: week one review and the first longer video.`,
  },
  {
    day: 7, week: 1, focus: 'Review: turn six days into one story', domain: 'Review',
    title: 'Week 1 review: discovery patterns across six industries',
    business: { name: 'Your own lab', profile: 'Six businesses, six discovery calls. Today you find the pattern and tell it well.' },
    data: [{ name: 'Your notes from days 1 to 6', url: '/fde-lab.html', use: 'Discovery notes, findings and the hidden constraint you found each day.' }],
    pain: ['Which hidden constraint did you miss in the role-play, and why?'],
    people: [{ role: 'Hiring manager (FDE)', cares: 'Can you run discovery with a skeptical executive and change your plan?', hidden: 'Will ask for the time you were wrong.' }],
    ask: ['Which question surfaced the most useful fact this week?', 'Where did you start building too early?'],
    sql: ['None today. Re-run your best query and screenshot it for the video.'],
    value: 'List each day\'s rough value next to the hidden constraint that capped it.',
    build: {
      goal: 'A lab README index and a 3-minute week-one video.',
      prompt: `Week 1 review for my FDE lab repo. Create README.md at the repo root:

1. One paragraph: what this lab is (30 days, one real business problem a day, discovery to build).
2. A table for days 1 to 6: day, industry, problem, data source, key finding (leave [placeholders]), hidden constraint, link to the folder.
3. "Discovery patterns" section: 5 bullets on what I learned about asking before building. Leave [my words] placeholders where only I can write the lesson.
4. A "How to run any day" section with the common prerequisites (Node 22, Java 21, DuckDB CLI, an OpenAI-compatible LLM endpoint).

Read each dayNN folder's README to fill the table. Do not invent findings.`,
    },
    deliver: ['Root README with the week-one table', '3-minute video', 'Weekly real-conversation outreach sent (optional)'],
    video: `[Face, 3 min] Six businesses in six days: manufacturing, clinics, marketplace, telecom, hotels, banking.
Pattern one: the data showed the symptom, the discovery call showed the constraint. Give 2 examples.
Pattern two: the smallest useful build was always a ranked list or a scorecard, not a model.
Pattern three: [your own lesson].
Next week: value engineering and how enterprises actually buy.`,
    post: `Six businesses in six days. In every one the data showed the symptom and the discovery call showed the constraint.

Week one of my 30-day forward deployed engineer lab is done.

- Manufacturing: invoices clear in a weekly batch
- Clinics: reminders existed, nobody owned them
- Marketplace: sellers pick the carrier
- Telecom: the team can make 120 calls a day
- Hotels: the OTA contract blocks deposits
- Banking: no data leaves without a DPA

The build each day was small: a ranked list, a scorecard, a triage worker. [Your own lesson in one line.]

Week two is value engineering and how enterprises buy. Full video below.`,
  },
  {
    day: 8, week: 2, focus: 'Value engineering: build the business case', domain: 'Retail · Store operations',
    title: 'Sales forecasting and staffing at a drugstore chain',
    business: { name: '1,000-store drugstore chain (composite)', profile: 'Store managers plan staff and stock from last year plus gut feel. Promotions and holidays swing sales. Head office wants a business case before funding a forecasting tool.' },
    data: [
      { name: 'Rossmann Store Sales (real daily sales for 1,115 stores)', url: 'https://www.kaggle.com/c/rossmann-store-sales', use: 'Daily sales, customers, promotions, holidays, store type, competition distance.' },
    ],
    pain: ['Search retail worker forums for "understaffed on promo day".', 'Read store manager reviews on Glassdoor mentioning scheduling.'],
    people: [
      { role: 'CFO', cares: 'Payback period and labour cost as a share of sales.', hidden: 'Approves only projects with payback under 12 months and a named baseline.' },
      { role: 'VP Store Operations', cares: 'Staffing on peak days.', hidden: 'Union agreement requires rosters 2 weeks ahead, so forecasts need a 14-day horizon.' },
    ],
    ask: ['What is labour cost as a share of sales today?', 'How far ahead are rosters fixed?', 'What baseline would you accept to measure improvement?'],
    sql: ['Sales uplift on promo days by store type.', 'Sales on the day before and after state holidays.', 'Error of the naive forecast "same weekday last year" (mean absolute percentage error).'],
    value: 'Value = stores x labour hours mis-scheduled per week x hourly cost x share fixed by a better forecast x 52, plus lost sales on understaffed promo days.',
    build: {
      goal: 'A 14-day forecast baseline per store and a one-page business case with payback for the CFO.',
      prompt: `Day 8 of my FDE lab: value engineering. Build day08-retail/.

Data: train.csv and store.csv (Rossmann) at day08-retail/data/.

Build:
1. baseline.sql (DuckDB): a seasonal naive forecast (same weekday, same week last year, adjusted for promo flag) and its MAPE per store type for the last 6 weeks of data.
2. A better but explainable forecast in SQL: average of the last 4 same weekdays, multiplied by the store's promo uplift when a promo is planned. Compare MAPE.
3. business-case.md: inputs table (stores, hours, cost per hour, error reduction) with [placeholders] for the CFO's numbers, a payback calculation, risks, and the measurement plan against the agreed baseline.
4. A Node.js script that fills business-case.md's numbers from the SQL results and prints the payback months.

No machine learning model. The point is a defensible baseline and business case.`,
    },
    deliver: ['Baseline vs improved MAPE', 'Business case with payback', 'Measurement plan', 'Repo folder day08-retail pushed'],
    video: `[Face] Day 8, week two: value engineering. A drugstore chain wants a business case before it funds forecasting.
[Screen] Same-weekday-last-year is off by [X%]. A simple promo-aware average gets to [Y%].
[Screen] Here is the CFO's one-pager: inputs, payback in [N] months, and the baseline we agreed to measure against.
[Face] No model yet. A defensible baseline first.`,
    post: `The CFO would only fund it with payback under 12 months against a named baseline. So I built the baseline first.

Day 8 of my 30-day lab, on real daily sales from 1,115 drugstores.

- Last year's same weekday: [X%] error
- A promo-aware 4-week average: [Y%] error
- Rough payback on better staffing: [N] months

No machine learning yet. The business case says what we measure, against what, and when we stop if it does not work.

Tomorrow: logistics and orders that ship late.`,
  },
  {
    day: 9, week: 2, focus: 'Value engineering: price the problem in the customer\'s own numbers', domain: 'Logistics · Fulfilment',
    title: 'Late shipments at a supply chain company',
    business: { name: 'Global e-commerce supplier (composite)', profile: 'Ships orders by four shipping modes. Many orders arrive late versus the scheduled days; the commercial team discounts to compensate.' },
    data: [
      { name: 'DataCo Smart Supply Chain (about 180k orders)', url: 'https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis', use: 'Shipping mode, scheduled vs real shipping days, late delivery risk, region, sales, profit.' },
    ],
    pain: ['Search logistics subreddits for "promised delivery date" and "SLA penalty".'],
    people: [
      { role: 'COO', cares: 'On-time in full and cost to serve.', hidden: 'First Class is late most often because it is promised in 1 day but ships from a warehouse that picks once a day.' },
      { role: 'CFO', cares: 'Margin erosion from discounts and refunds.', hidden: 'Discounts given for lateness are not tagged, so nobody knows their total.' },
    ],
    ask: ['What do you give a customer when an order is late?', 'Where is the promise date set, and by whom?', 'Can we tag lateness discounts from today?'],
    sql: ['Late share by shipping mode and region.', 'Average days late by shipping mode.', 'Profit on late vs on-time orders.'],
    value: 'Value = late orders per year x average discount or refund for lateness + lost repeat orders x margin. Tag lateness discounts first to get the real number.',
    build: {
      goal: 'A promise-date checker that flags orders whose promised mode cannot be met from the warehouse pick schedule, plus a value model.',
      prompt: `Day 9 of my FDE lab. Build day09-logistics/.

Data: DataCoSupplyChainDataset.csv at day09-logistics/data/ (latin-1 encoding; convert to UTF-8 first if needed).

Build:
1. late.sql (DuckDB): late share and average days late by shipping mode and order region; profit per order for late vs on-time.
2. A Spring Boot 3 service with POST /promise-check taking {shippingMode, orderTime, warehousePickCutoffHour} and returning {feasible, reason, suggestedMode}; rules from the analysis (e.g. First Class after the daily pick cutoff cannot ship same day).
3. value-model.md with the formula, inputs from the SQL, and [placeholders] for discount per late order from the CFO.
4. README with findings in [placeholders].`,
    },
    deliver: ['Late share by mode', 'Promise checker endpoint', 'Value model', 'Repo folder day09-logistics pushed'],
    video: `[Face] Day 9. A supplier whose fastest shipping option is late most often.
[Screen] First Class orders were late [X%] of the time. Standard: [Y%].
[Screen] The cause sits upstream: a 1-day promise from a warehouse that picks once a day. This check stops that promise at checkout.
[Face] And the CFO now tags every lateness discount, so next month we have the real cost.`,
    post: `The fastest shipping option was late [X%] of the time. Standard shipping, [Y%].

Day 9 of my 30-day lab, on about 180k supply chain orders.

The data said First Class was the problem. The COO role-play said why: a 1-day promise from a warehouse that picks once a day.

So I built:
- A promise check at checkout that refuses promises the warehouse cannot keep
- A value model, waiting on one number the CFO had never tracked: discounts given for lateness

Tagging those discounts is the first deliverable. Software second.

Tomorrow: a city's service requests.`,
  },
  {
    day: 10, week: 2, focus: 'Solution design: options and trade-offs', domain: 'Public sector · City services',
    title: 'Service request backlog at a city 311 centre',
    business: { name: 'City services department (composite)', profile: 'Residents report noise, potholes, heating and more. Requests are routed to agencies; some wait weeks. The commissioner wants faster closure without hiring.' },
    data: [
      { name: 'NYC 311 Service Requests (real, NYC Open Data)', url: 'https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2010-to-Present/erm2-nwe9', use: 'Complaint type, agency, created and closed dates, borough, status. Download one month as CSV.' },
    ],
    pain: ['Read local news on 311 response times.', 'Read resident complaints on community boards about repeat requests.'],
    people: [
      { role: 'Commissioner', cares: 'Median days to close and repeat requests.', hidden: 'Any new system must pass a public-sector security review that takes 3 months, so a pilot has to use existing tools.' },
      { role: 'Agency dispatcher', cares: 'Duplicate requests for the same pothole.', hidden: 'Duplicates are a third of the noise; dispatchers close them by hand.' },
    ],
    ask: ['What would you accept as a pilot without a new system?', 'How do you spot duplicates today?', 'Who decides routing rules?'],
    sql: ['Median hours to close by complaint type and agency.', 'Likely duplicates: same complaint type within 50 metres and 48 hours.', 'Backlog of open requests older than 14 days by agency.'],
    value: 'Value = duplicate requests per year x minutes to triage x cost per minute + faster closure on the top 3 types (ask for their cost per open day).',
    build: {
      goal: 'Three solution options on one page (rules only, rules plus LLM triage, full platform) and a duplicate detector as the pilot.',
      prompt: `Day 10 of my FDE lab: solution design. Build day10-city311/.

Data: one month of NYC 311 requests as CSV at day10-city311/data/.

Build:
1. backlog.sql (DuckDB): median hours to close by type and agency; open requests older than 14 days.
2. duplicates.sql: pairs of requests with the same complaint type within 50 metres (haversine on lat/long) and 48 hours; count per type.
3. options.md: three options with effort, time to value, security review impact, risks and a recommendation. Option A: duplicate rules exported as a daily CSV into the existing system (no new system, pilot-safe). Option B: plus LLM triage of free text. Option C: a full case platform. Recommend A first.
4. A Node.js script that writes the daily duplicate CSV.
5. README with findings in [placeholders].`,
    },
    deliver: ['Backlog by agency', 'Duplicate rate', 'Three-option design page', 'Daily duplicate CSV', 'Repo folder day10-city311 pushed'],
    video: `[Face] Day 10. A city service desk drowning in requests.
[Screen] About [X%] of one month's requests look like duplicates: same issue, same block, same two days.
[Screen] Three options on one page. I recommended the smallest: a daily duplicate file into the system they already have, because a new system means a 3-month security review.
[Face] Good solution design starts from what the customer can say yes to this month.`,
    post: `[X%] of a month of real city service requests looked like duplicates. Same issue, same block, within 48 hours.

Day 10 of my 30-day FDE lab: solution design.

I wrote three options for the commissioner:
- A daily duplicate file into the current system
- That plus LLM triage of free-text requests
- A new case platform

I recommended the first, because any new system means a 3-month security review. A pilot they can approve this month beats a better design they can approve next quarter.

Tomorrow: vehicle complaints and an automaker's warranty team.`,
  },
  {
    day: 11, week: 2, focus: 'Solution design: AI where it earns its place', domain: 'Automotive · Warranty and quality',
    title: 'Early warning from vehicle complaints at an automaker',
    business: { name: 'Mid-size automaker (composite)', profile: 'Quality engineers read owner complaints to spot defects early. They read a sample by hand; patterns surface months after warranty costs start rising.' },
    data: [
      { name: 'NHTSA vehicle complaints (real, public datasets and API)', url: 'https://www.nhtsa.gov/nhtsa-datasets-and-apis', use: 'Make, model, year, component, complaint narrative, crash and fire flags, date.' },
    ],
    pain: ['Read 30 complaint narratives for one model year.', 'Search owner forums for the top component you find.'],
    people: [
      { role: 'VP Quality', cares: 'Time from first complaint to engineering action.', hidden: 'Legal requires any safety-related signal to reach a human within 24 hours; AI can sort but not dismiss.' },
      { role: 'Warranty analyst', cares: 'Fewer false alarms.', hidden: 'Component codes in complaints are often wrong; the narrative is more reliable.' },
    ],
    ask: ['How fast should a safety signal reach an engineer?', 'What does a false alarm cost you?', 'Which component codes do you trust least?'],
    sql: ['Complaints per month by component for one make and model year.', 'Components with the fastest growth over the last 6 months.', 'Share of complaints flagged crash or fire by component.'],
    value: 'Value = weeks earlier detection x warranty cost per week for a typical defect campaign (ask for one past campaign) + analyst hours saved.',
    build: {
      goal: 'A weekly signal report: component trends from SQL, plus an LLM pass that re-tags component from the narrative and routes anything safety-related to a human.',
      prompt: `Day 11 of my FDE lab. Build day11-auto/.

Data: NHTSA complaints for one make (download the flat file or use the API) into day11-auto/data/.

Build:
1. trends.sql (DuckDB): monthly counts by component for the chosen make and model years; growth over the last 6 months.
2. A Node.js TypeScript worker retag.ts: for each narrative, call an OpenAI-compatible LLM (env LLM_BASE_URL, LLM_API_KEY, LLM_MODEL) and return validated JSON {component, safety_related: boolean, evidence_quote}. The evidence_quote must be an exact substring of the narrative; drop the result if it is not (a simple hallucination check). Anything safety_related goes to a human queue file, never auto-dismissed.
3. report.html: top growing components, re-tagged vs original component agreement rate, and the human queue count.
4. README with findings in [placeholders] and the 24-hour human rule.`,
    },
    deliver: ['Component trend table', 'Re-tag agreement rate', 'Human safety queue', 'Repo folder day11-auto pushed'],
    video: `[Face] Day 11. An automaker trying to spot defects earlier from owner complaints.
[Screen] Complaints about [component] grew [X%] in six months.
[Screen] The LLM re-tags each complaint from the narrative and must quote the exact sentence it used. If the quote is not in the text, the answer is thrown away.
[Face] Legal's rule: AI can sort safety complaints, never dismiss them.`,
    post: `My LLM had to quote the exact sentence behind every answer. If the quote was not in the complaint, the answer was thrown away.

Day 11 of my 30-day lab, on real NHTSA vehicle complaints.

- Complaints about [component] grew [X%] in six months
- Re-tagging from the narrative disagreed with the filed component code [Y%] of the time
- Every safety-related complaint went to a human queue

The VP Quality's rule shaped it: AI can sort safety signals, never dismiss them. Evidence quotes are a cheap guard against made-up answers.

Tomorrow: how an enterprise actually buys this.`,
  },
  {
    day: 12, week: 2, focus: 'Process to procure: security, legal and commercials', domain: 'Financial services · Procurement',
    title: 'Selling the complaint triage to an Indian NBFC',
    business: { name: 'Indian NBFC, consumer loans (composite)', profile: 'Liked the day 6 complaint triage. Now procurement, IT security, legal and finance all have to approve it before a pilot starts.' },
    data: [
      { name: 'RBI Ombudsman annual reports (real complaint statistics)', url: 'https://www.rbi.org.in/', use: 'Complaint volumes and top grounds for NBFCs, to size the problem in Indian terms.' },
      { name: 'Digital Personal Data Protection Act 2023 (India)', url: 'https://www.meity.gov.in/', use: 'Consent, purpose limitation and data fiduciary duties that shape your DPA.' },
    ],
    pain: ['Read the latest RBI ombudsman report section on NBFC complaints.'],
    people: [
      { role: 'CISO', cares: 'Where data goes, who can access it, audit trails.', hidden: 'Requires the vendor to pass a security questionnaire and allow a VAPT before production.' },
      { role: 'Head of Procurement', cares: 'Vendor onboarding and price.', hidden: 'Any spend above a threshold needs three quotes, unless it is a time-boxed paid pilot.' },
    ],
    ask: ['Who signs the pilot, and what is their spending limit?', 'What does your security review need from me, and how long does it take?', 'What would make the pilot convert to an annual contract?'],
    sql: ['None. Today is documents.'],
    value: 'Pilot price justified as a fraction of the yearly value from day 6, with success criteria that trigger the annual contract.',
    build: {
      goal: 'A procurement pack: answered security questionnaire, data flow diagram, DPA checklist, SOW with acceptance criteria, and pilot pricing.',
      prompt: `Day 12 of my FDE lab: process to procure. Create day12-procure/ with markdown documents, no code.

Context: the day06-complaints triage worker (read its README) is being bought by an Indian NBFC.

Create:
1. security-questionnaire.md: answer 25 common SIG Lite style questions (data storage location, encryption at rest and in transit, access control, logging, incident response, subprocessors, model provider, data retention, deletion, VAPT). Answer honestly for a small vendor and mark gaps as "planned" with a date.
2. data-flow.md: a Mermaid diagram of where complaint text goes, where it is stored, and what never leaves the customer environment.
3. dpa-checklist.md: items for a DPA under India's DPDP Act 2023 (purpose, consent basis, retention, breach notice, subprocessors). Flag that legal must review it.
4. sow.md: scope, out of scope, milestones, acceptance criteria tied to day 6 metrics, customer responsibilities, change control.
5. pricing.md: a 6-week paid pilot price, the success criteria that convert it, and an annual price as a share of the value model.
Keep each document short and plain.`,
    },
    deliver: ['Security questionnaire', 'Data flow diagram', 'DPA checklist', 'SOW', 'Pilot pricing', 'Repo folder day12-procure pushed'],
    video: `[Face] Day 12. The customer said yes. Now five departments have to say yes.
[Screen] Here is the procurement pack: security questionnaire, data flow, DPA checklist under India's DPDP Act, an SOW with acceptance criteria, and pilot pricing.
[Face] A forward deployed engineer who can get through procurement ships months earlier.`,
    post: `The customer said yes on day 6. On day 12, five departments still had to say yes.

Day 12 of my 30-day FDE lab was the part demos skip: how an enterprise buys.

What I prepared for an Indian NBFC:
- A security questionnaire, with gaps marked honestly with dates
- A data flow diagram showing what never leaves their network
- A DPA checklist under the DPDP Act 2023
- An SOW with acceptance criteria tied to real metrics
- A paid pilot price with the terms that convert it

Starting procurement on day one of a pilot saves weeks at the end.

Tomorrow: agriculture and commodity prices.`,
  },
  {
    day: 13, week: 2, focus: 'Value engineering in low-margin businesses', domain: 'Agriculture · Commodity trading',
    title: 'Price alerts for a farmer producer organisation',
    business: { name: 'Farmer producer organisation, Maharashtra (composite)', profile: 'Aggregates produce from 2,000 farmers and sells to mandis. A bad day at the wrong mandi wipes out the season margin. Prices are public but nobody watches them daily.' },
    data: [
      { name: 'AGMARKNET daily mandi prices (real, via data.gov.in)', url: 'https://www.data.gov.in/', use: 'Search "current daily price of various commodities from various markets (mandi)". Commodity, market, min, max, modal price, date.' },
    ],
    pain: ['Read news on tomato and onion price crashes and farmer losses.'],
    people: [
      { role: 'FPO CEO', cares: 'Price realised per quintal and farmer trust.', hidden: 'Most members use basic phones; alerts must work over SMS or WhatsApp in Marathi.' },
      { role: 'Field coordinator', cares: 'Which mandi to send the truck to tomorrow.', hidden: 'Transport to a farther mandi costs a fixed amount per trip, so the price gap must beat it.' },
    ],
    ask: ['How do you choose the mandi today?', 'What price gap makes a longer trip worth it?', 'How do members want to receive alerts?'],
    sql: ['Modal price by mandi for one commodity over 30 days.', 'Days when the best mandi beat the nearest by more than the transport cost.', 'Moves of 40% or more against the 30-day median.'],
    value: 'Value = quintals sold per season x average extra price per quintal from choosing the better mandi, minus extra transport.',
    build: {
      goal: 'A daily best-mandi recommendation after transport cost, and an alert message in Marathi and English.',
      prompt: `Day 13 of my FDE lab. Build day13-agri/.

Data: 60 days of AGMARKNET prices for one commodity in Maharashtra (CSV from data.gov.in) at day13-agri/data/.

Build:
1. prices.sql (DuckDB): modal price by mandi by day; for each day, the best mandi net of a transport table (transport.csv: mandi, cost per quintal from the FPO's village, which you fill with [placeholders]).
2. A Node.js TypeScript script alert.ts that writes tomorrow's recommendation and a 2-line alert in Marathi and English using an OpenAI-compatible LLM, given only the numbers. Validate that the numbers in the message match the input numbers exactly; if not, fall back to a fixed template.
3. README with findings in [placeholders] and how this would go over WhatsApp Business API.`,
    },
    deliver: ['Best mandi net of transport', 'Alert in Marathi and English', 'Season value estimate', 'Repo folder day13-agri pushed'],
    video: `[Face] Day 13. A farmer producer organisation deciding which mandi to send tomorrow's truck to.
[Screen] Over 60 days, the best mandi beat the nearest by more than transport cost on [X] days.
[Screen] Every evening this writes one recommendation and a two-line alert in Marathi and English, and checks the numbers match before sending.
[Face] Built for basic phones, because that is what members use.`,
    post: `On [X] of 60 days, a farther mandi paid enough to cover the extra truck trip. Nobody was watching.

Day 13 of my 30-day lab, on real AGMARKNET prices from Maharashtra.

What I built for a farmer producer organisation:
- The best mandi for tomorrow, net of transport cost
- A two-line alert in Marathi and English
- A check that the numbers in the message match the data before it goes out

Members use basic phones, so the delivery channel decided half the design.

Tomorrow: week two review.`,
  },
  {
    day: 14, week: 2, focus: 'Review: value and procurement', domain: 'Review',
    title: 'Week 2 review: from finding to funded',
    business: { name: 'Your own lab', profile: 'Six more businesses. This week was about value and how customers buy.' },
    data: [{ name: 'Your notes from days 8 to 13', url: '/fde-lab.html', use: 'Value models, payback numbers and procurement documents.' }],
    pain: ['Which value model would a CFO challenge first?'],
    people: [{ role: 'Enterprise account executive', cares: 'Can you help close the deal without overpromising?', hidden: 'Will ask what you do when the pilot misses its target.' }],
    ask: ['Which input in your value models is weakest?', 'Which constraint would block procurement longest?'],
    sql: ['None.'],
    value: 'Put all twelve value estimates in one table with the weakest input marked.',
    build: {
      goal: 'Update the root README with week two and a value table; record the second longer video.',
      prompt: `Week 2 review. Update the root README.md of my FDE lab repo:
1. Add days 8 to 13 to the table (read each folder's README; do not invent numbers).
2. Add a "Value engineering" section: one table with each day's rough yearly value, the weakest input and who must confirm it.
3. Add a "How enterprises buy" section summarising day12-procure in 6 bullets.
Leave [my words] placeholders for lessons only I can write.`,
    },
    deliver: ['README week two section', 'Value table', '3-minute video'],
    video: `[Face, 3 min] Week two: value engineering and procurement.
Show the value table. Pick the weakest input and say how you would get the real number from the customer.
Walk through the procurement pack in 60 seconds.
[Your own lesson].
Next week: one platform that runs every business from the last two weeks.`,
    post: `Twelve business problems in two weeks. The weakest number in almost every business case was one the customer had never tracked.

Week two of my 30-day forward deployed engineer lab:
- Retail: a baseline before any forecast
- Logistics: tag lateness discounts first
- City services: a pilot that skips a 3-month review
- Automotive: AI can sort safety signals, never dismiss them
- Financial services: the procurement pack
- Agriculture: alerts sized for basic phones

[Your own lesson in one line.]

Week three: one reusable platform that runs all of them. Video below.`,
  },
  {
    day: 15, week: 3, focus: 'Build: a reusable platform core', domain: 'Platform · Spring Boot core',
    title: 'OpsPilot core: cases, rules, approvals and audit',
    business: { name: 'Coatings manufacturer again, now as workspace 1', profile: 'You onboard the day 1 procure-to-pay problem as the first workspace on a reusable platform, the way a vendor would.' },
    data: [{ name: 'BPI Challenge 2019 (from day 1)', url: 'https://data.4tu.nl/', use: 'Load purchase order items as cases.' }],
    pain: ['Which parts of days 1 to 13 were the same every time? Cases, owners, rules, approvals, audit.'],
    people: [{ role: 'Your own platform team', cares: 'Reuse across customers.', hidden: 'Every customer will want a different data shape; the core must not hard-code one.' }],
    ask: ['What is a "case" in every business you saw?', 'Which actions always need a human approval?'],
    sql: ['None. Today is the core.'],
    value: 'Time to onboard a new customer: target under one day for a CSV-based workspace.',
    build: {
      goal: 'A Spring Boot core with workspaces, cases, rules, approvals and an append-only audit log, plus a CSV connector that loads day 1 as workspace 1.',
      prompt: `Day 15 of my FDE lab: start the reusable platform. Create a new repo folder opspilot/core as a Spring Boot 3 app (Java 21, Maven, PostgreSQL via Docker Compose, Flyway migrations).

Domain:
- Workspace (id, name, domain, created_at)
- Case (id, workspace_id, external_ref, type, status, priority, owner, payload JSONB, created_at, updated_at)
- Rule (id, workspace_id, name, condition as a small JSON expression over payload fields, action: set_priority | assign | require_approval)
- Approval (id, case_id, requested_action, status: pending|approved|rejected, decided_by, decided_at)
- AuditEvent (id, workspace_id, case_id, actor, action, before JSONB, after JSONB, at). Append-only: no update or delete endpoints, and a database trigger that rejects UPDATE and DELETE on this table.

API: REST endpoints for workspaces, cases (list with filters, get, update status), rules (CRUD for rules only), approvals (request, decide). Every change writes an AuditEvent.
Connector: POST /workspaces/{id}/import-csv with a mapping JSON (which column is external_ref, type, priority, the rest into payload). Use it to load the day 1 BPI purchase order items as workspace "coatings-p2p".
Tests: JUnit tests for the rule evaluator and for the audit trigger refusing updates.
README: architecture, how to run (docker compose up, mvn spring-boot:run), and the import command for day 1.
Keep it clean and small; no Spring Security yet, that is day 20.`,
    },
    deliver: ['Spring Boot core running', 'Workspace 1 imported from day 1', 'Audit log that refuses edits', 'Tests passing', 'opspilot/core pushed'],
    video: `[Face] Day 15, week three. Two weeks, twelve businesses, and the same shapes kept coming back: cases, owners, rules, approvals, audit.
[Screen] So this is OpsPilot core in Spring Boot. Workspace one is the coatings company from day 1, imported from a CSV in one call.
[Screen] The audit log is append-only. Watch the database refuse an edit.
[Face] Tomorrow, an AI agent works on top of it.`,
    post: `Twelve businesses in two weeks, and every one had the same five things: cases, owners, rules, approvals and an audit trail.

Day 15 of my 30-day FDE lab: I started building them once.

OpsPilot core, in Spring Boot and PostgreSQL:
- Any business becomes a workspace through a CSV mapping
- Rules set priority, assign owners or require approval
- An append-only audit log the database itself protects

Workspace one is the coatings company from day 1, imported in one call.

Tomorrow: an AI agent that works on top of it, with a human approving every action.`,
  },
);
