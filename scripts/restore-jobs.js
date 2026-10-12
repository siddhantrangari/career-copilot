import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.CAREER_COPILOT_DB_PORT || '5438', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'career_secret_2026',
  database: process.env.DB_NAME || 'career_copilot_os',
});

const jobsToRestore = [
  {
    id: 'scaleai',
    name: 'Scale AI',
    region: 'global',
    roles: ['ai', 'fs'],
    pay: '$140–$220k',
    desc: 'Frontier AI data & infrastructure platform.',
    apply: 'https://job-boards.greenhouse.io/scaleai/jobs/4654897005',
    jd: 'https://job-boards.greenhouse.io/scaleai/jobs/4654897005',
    notes: 'Senior Software Engineer - Agentic Tooling & Productivity',
    stage: 'networking'
  },
  {
    id: 'servicenow',
    name: 'ServiceNow',
    region: 'global',
    roles: ['fs', 'se'],
    pay: '$130–$180k',
    desc: 'Enterprise cloud digital workflow platform.',
    apply: 'https://careers.servicenow.com/jobs/744000153333219/sr-software-engineer/',
    jd: 'https://careers.servicenow.com/jobs/744000153333219/sr-software-engineer/',
    notes: 'Sr Software Engineer (Santa Clara / Global)',
    stage: 'networking'
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    region: 'global',
    roles: ['fs', 'se'],
    pay: '$130–$190k',
    desc: 'Enterprise cloud CRM & AI platform.',
    apply: 'https://www.salesforce.com/company/careers/jobs/JR359744/software-engineering-pmts/',
    jd: 'https://www.salesforce.com/company/careers/jobs/JR359744/software-engineering-pmts/',
    notes: 'Software Engineering PMTS / Senior Manager',
    stage: 'networking'
  },
  {
    id: 'sap',
    name: 'SAP',
    region: 'eu',
    roles: ['fs'],
    pay: '€85–€120k',
    desc: 'Global enterprise ERP & software solutions.',
    apply: 'https://jobs.sap.com/en/jobs/744000152634355/devops-engineering-specialist-with-python-fixed-term-contract/',
    jd: 'https://jobs.sap.com/en/jobs/744000152634355/devops-engineering-specialist-with-python-fixed-term-contract/',
    notes: 'DevOps Engineering Specialist with Python',
    stage: 'networking'
  },
  {
    id: 'propertyfinder',
    name: 'Property Finder',
    region: 'gulf',
    roles: ['fs'],
    pay: '$90–$130k tax-free',
    desc: 'UAE leading real estate portal & technology platform.',
    apply: 'https://propertyfinder.teamtailor.com/jobs/8002401-senior-software-engineer',
    jd: 'https://propertyfinder.teamtailor.com/jobs/8002401-senior-software-engineer',
    notes: 'Senior Software Engineer / Fullstack Software Engineer',
    stage: 'networking'
  },
  {
    id: 'noon',
    name: 'Noon',
    region: 'gulf',
    roles: ['fs'],
    pay: '$85–$120k tax-free',
    desc: 'Dubai e-commerce giant. Java + Spring Boot backend.',
    apply: 'https://noon.careers/?ashby_jid=25bdecf8-a34d-47fe-89dd-3102cc64381c',
    jd: 'https://noon.careers/?ashby_jid=25bdecf8-a34d-47fe-89dd-3102cc64381c',
    notes: 'Backend / Full-Stack Engineer',
    stage: 'networking'
  },
  {
    id: 'bayzat',
    name: 'Bayzat',
    region: 'gulf',
    roles: ['fs', 'se'],
    pay: '$85–$115k tax-free',
    desc: 'Dubai HR & insurance SaaS. Java/Spring Boot + React.',
    apply: 'https://bayzat.whitecarrot.ai/jobs/09b66536-855e-4dae-a710-eb11f329d7bd',
    jd: 'https://bayzat.whitecarrot.ai/jobs/09b66536-855e-4dae-a710-eb11f329d7bd',
    notes: 'Solutions Engineer / Software Engineer',
    stage: 'networking'
  },
  {
    id: 'chainguard',
    name: 'Chainguard',
    region: 'global',
    roles: ['ai', 'se'],
    pay: '$120–$160k',
    desc: 'AI Solutions Engineer — Claude Code, MCP, LLM APIs.',
    apply: 'https://job-boards.greenhouse.io/chainguard/jobs/4709217006',
    jd: 'https://job-boards.greenhouse.io/chainguard/jobs/4709217006',
    notes: 'Senior Partner Solutions Architect - India (Professional Services)',
    stage: 'networking'
  },
  {
    id: 'cresta',
    name: 'Cresta',
    region: 'global',
    roles: ['ai', 'fs'],
    pay: '$130–$170k',
    desc: 'Real-time generative AI platform for contact centers.',
    apply: 'https://job-boards.greenhouse.io/cresta/jobs/5133464008',
    jd: 'https://job-boards.greenhouse.io/cresta/jobs/5133464008',
    notes: 'Senior Software Engineer, Backend (AI Agent)',
    stage: 'networking'
  },
  {
    id: 'natera',
    name: 'Natera',
    region: 'global',
    roles: ['ai', 'se'],
    pay: '$120–$160k',
    desc: 'Global leader in cell-free DNA testing & AI clinical systems.',
    apply: 'https://job-boards.greenhouse.io/natera/jobs/6115022004',
    jd: 'https://job-boards.greenhouse.io/natera/jobs/6115022004',
    notes: 'Forward Deployed AI Solutions Engineer',
    stage: 'networking'
  },
  {
    id: 'twilio',
    name: 'Twilio',
    region: 'global',
    roles: ['se', 'fs'],
    pay: '$120–$160k',
    desc: 'Cloud communications platform.',
    apply: 'https://job-boards.greenhouse.io/twilio/jobs/7716279',
    jd: 'https://job-boards.greenhouse.io/twilio/jobs/7716279',
    notes: 'Staff Software Engineer (L4)',
    stage: 'networking'
  },
  {
    id: 'grafana',
    name: 'Grafana Labs',
    region: 'eu',
    roles: ['fs', 'se'],
    pay: '€90–€130k',
    desc: 'Open observability and dashboarding platform.',
    apply: 'https://job-boards.greenhouse.io/grafanalabs/jobs/6105872004',
    jd: 'https://job-boards.greenhouse.io/grafanalabs/jobs/6105872004',
    notes: 'Staff Backend Engineer - Grafana Alerting | Germany | Remote',
    stage: 'networking'
  },
  {
    id: 'langchain',
    name: 'LangChain',
    region: 'global',
    roles: ['ai', 'fde'],
    pay: '$130–$170k',
    desc: 'The leading framework for LLM & agent applications.',
    apply: 'https://jobs.ashbyhq.com/langchain/0ee73994-b8a3-4a75-9675-da536abd3e10?embed=js',
    jd: 'https://jobs.ashbyhq.com/langchain/0ee73994-b8a3-4a75-9675-da536abd3e10?embed=js',
    notes: 'FDE / Solutions Engineer',
    stage: 'networking'
  },
  {
    id: 'everbridge',
    name: 'Everbridge',
    region: 'global',
    roles: ['fs', 'ai'],
    pay: '$120–$160k',
    desc: 'Critical Event Management software enterprise.',
    apply: 'https://www.linkedin.com/jobs/view/4469012274/?companyName=Everbridge&trackingId=IcQ40UZ0THi1QaFwRiJqBw%3D%3D&applicantTrackingSystemName=Lever',
    jd: 'https://www.linkedin.com/jobs/view/4469012274/?companyName=Everbridge&trackingId=IcQ40UZ0THi1QaFwRiJqBw%3D%3D&applicantTrackingSystemName=Lever',
    notes: 'Senior Full-Stack Software Engineer, AI & Data',
    stage: 'networking'
  },
  {
    id: 'adyen',
    name: 'Adyen',
    region: 'eu',
    roles: ['fs'],
    pay: '€85–€120k',
    desc: 'Amsterdam global financial technology platform.',
    apply: 'https://careers.adyen.com/vacancies/6761873-java-software-engineer-cx?locale=en',
    jd: 'https://careers.adyen.com/vacancies/6761873-java-software-engineer-cx?locale=en',
    notes: 'Java Software Engineer - CX',
    stage: 'networking'
  },
  {
    id: 'datadog',
    name: 'Datadog',
    region: 'global',
    roles: ['fs', 'se'],
    pay: '$130–$170k',
    desc: 'Cloud-scale monitoring and observability SaaS.',
    apply: 'https://careers.datadoghq.com/detail/8223819/?gh_jid=8223819',
    jd: 'https://careers.datadoghq.com/detail/8223819/?gh_jid=8223819',
    notes: 'Senior Software Engineer - CI/CD Security',
    stage: 'networking'
  },
  {
    id: 'majidalfuttaim',
    name: 'Majid Al Futtaim',
    region: 'gulf',
    roles: ['fs'],
    pay: '$90–$130k tax-free',
    desc: 'Leading shopping mall, retail and leisure pioneer across MENA.',
    apply: 'https://careers.majidalfuttaim.com/global/en',
    jd: 'https://careers.majidalfuttaim.com/global/en',
    notes: 'Digital & Technology Engineering',
    stage: 'networking'
  }
];

async function run() {
  for (const item of jobsToRestore) {
    await pool.query(
      `INSERT INTO companies (id, name, region, roles, pay, description, apply_url, dsa, custom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, true)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         region = EXCLUDED.region,
         roles = EXCLUDED.roles,
         pay = EXCLUDED.pay,
         description = EXCLUDED.description,
         apply_url = EXCLUDED.apply_url,
         updated_at = now()`,
      [item.id, item.name, item.region, item.roles, item.pay, item.desc, item.apply]
    );

    await pool.query(
      `INSERT INTO tracked_companies (company_id, stage, win_status, msgs, jd, job_link, notes, updated_at)
       VALUES ($1, $2, 'none', '', $3, $4, $5, now())
       ON CONFLICT (company_id) DO UPDATE SET
         stage = EXCLUDED.stage,
         jd = EXCLUDED.jd,
         job_link = EXCLUDED.job_link,
         notes = EXCLUDED.notes,
         updated_at = now()`,
      [item.id, item.stage, item.jd, item.jd, item.notes]
    );
  }
  console.log(`Successfully restored ${jobsToRestore.length} companies to Networking pipeline in database!`);
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
