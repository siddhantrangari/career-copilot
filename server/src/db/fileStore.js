const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/career_store.json');

// Default initial state
const defaultStore = {
  users: [
    {
      id: 'user-default-01',
      full_name: 'Siddhant Rangari',
      email: 'siddhant@example.com',
      password_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', // 'test' / standard hash
      current_role: 'AI Engineer & Full-Stack Architect',
      created_at: new Date().toISOString()
    }
  ],
  resumes: [
    {
      id: 'res-master-01',
      user_id: 'user-default-01',
      title: 'My Career Profile',
      is_profile_setup: false,
      full_name: '',
      email: '',
      phone: '',
      linkedin_url: '',
      portfolio_url: '',
      location: '',
      current_role: '',
      target_role: '',
      target_ctc: '',
      summary: '',
      skills: [],
      experiences: [],
      education: [],
      certifications: [],
      linkedin_connected: false,
      linkedin_access_token: null,
      linkedin_member_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  ats_audits: [],
  tailored_resumes: [],
  mock_interviews: [],
  job_applications: [],
  executive_tools: [],
  networking_contacts: [],
  relevant_profiles: [
    {
      id: 'prof-anubhav-01',
      user_id: 'user-default-01',
      name: 'Anubhav Sharma (Anubhav in Tech)',
      handle: 'anubhavintech',
      linkedin_url: 'https://www.linkedin.com/in/anubhavintech/',
      title: 'Tech Career Mentor & Engineering Creator',
      company: 'Anubhav in Tech',
      category_tag: 'Tech Influencer & Mentor',
      avatar_initials: 'AS',
      why_relevant: 'Leading tech career mentor and software engineering influencer. Creates high-impact breakdowns on system design, interview preparation, salary negotiation, and cracking top tech firms.',
      superpowers: [
        'Tech Career Growth & Mentorship',
        'System Design & Architecture Deconstructions',
        'Viral LinkedIn Thought Leadership',
        'Interview Strategy & Salary Scaling'
      ],
      outreach_hook: 'Loved your recent breakdown on tech career acceleration and system architecture. Would love to connect and follow your engineering insights.',
      key_learnings: 'Consistent high-signal technical content, clear value-first communication, and structured breakdown of complex engineering concepts build immense career authority.',
      notes: 'Key engineering role model for technical branding, career mindset, and high-leverage networking.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  target_jobs: [
    {
      id: 'job-granola-ai-01',
      user_id: 'user-default-01',
      job_title: 'AI Engineer',
      company_name: 'Granola',
      job_url: 'https://www.granola.ai/jobs/ai-engineer',
      location: 'London, UK / Remote',
      salary_range: '$140k - $200k + Equity',
      category: 'Target Dream Role',
      match_score: 94,
      why_targeted: 'Pioneering AI workspace & meeting intelligence product. Elite craft, high autonomy, cutting-edge audio transcription to structured knowledge pipeline.',
      required_skills: [
        'LLMs & Prompt Engineering',
        'TypeScript / React UI Craft',
        'Python & PyTorch',
        'Audio & Speech Transcription Pipelines',
        'Low-Latency Streaming Systems'
      ],
      job_description: 'Granola is building the future of meeting intelligence and personal AI cognition. As an AI Engineer, you will design, fine-tune, and deploy state-of-the-art LLM pipelines that transform raw conversation audio into high-density structured knowledge artifacts, action items, and executive summaries with zero latency.',
      key_superpowers_needed: [
        'Production LLM Evaluation & Inference Optimization',
        'High-Craft UI/UX for Human-in-the-loop AI',
        'Low-Latency Streaming APIs',
        'Rapid Prototyping & Product Sense'
      ],
      action_strategy: 'Pitch an interactive mini-agent prototype demonstrating real-time structured meeting note synthesis and reach out directly to Granola engineering founders on LinkedIn.',
      notes: 'Top priority dream role. Combines elite product craft with high-scale LLM infrastructure.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

let memoryStore = { ...defaultStore };

function loadStore() {
  try {
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      memoryStore = {
        users: parsed.users || defaultStore.users,
        resumes: parsed.resumes || defaultStore.resumes,
        ats_audits: parsed.ats_audits || [],
        tailored_resumes: parsed.tailored_resumes || [],
        mock_interviews: parsed.mock_interviews || [],
        job_applications: parsed.job_applications || [],
        executive_tools: parsed.executive_tools || [],
        networking_contacts: parsed.networking_contacts || [],
        relevant_profiles: parsed.relevant_profiles || defaultStore.relevant_profiles,
        target_jobs: parsed.target_jobs || defaultStore.target_jobs
      };
      console.log(`[Store] Loaded persistent data from ${DATA_FILE} (${memoryStore.resumes.length} profiles, ${memoryStore.users.length} users, ${memoryStore.target_jobs.length} target jobs)`);
    } else {
      saveStore();
      console.log(`[Store] Initialized new persistent store at ${DATA_FILE}`);
    }
  } catch (err) {
    console.error('[Store] Error loading persistent store:', err.message);
    memoryStore = { ...defaultStore };
  }
}

function saveStore() {
  try {
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf8');
  } catch (err) {
    console.error('[Store] Failed to write persistent store:', err.message);
  }
}

// Initial load on require
loadStore();

module.exports = {
  getStore: () => memoryStore,
  saveStore,
  reloadStore: loadStore
};
