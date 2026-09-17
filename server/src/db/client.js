const { Pool } = require('pg');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');
const fileStore = require('./fileStore');

let pool = null;
let isConnected = false;

// Access the persistent memory store backed by JSON file
const getMemoryStore = () => fileStore.getStore();
const saveStore = () => fileStore.saveStore();

async function initDb() {
  try {
    pool = new Pool({
      connectionString: config.database.url,
      connectionTimeoutMillis: 2000,
    });

    const client = await pool.connect();
    console.log(`[DB] Connected successfully to PostgreSQL on port ${config.database.port}`);
    isConnected = true;

    // Create tables if not exist in PostgreSQL
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        current_role VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS resumes (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100),
        title VARCHAR(255) NOT NULL DEFAULT 'Executive Master Resume',
        is_profile_setup BOOLEAN DEFAULT false,
        full_name VARCHAR(255) NOT NULL DEFAULT '',
        email VARCHAR(255),
        phone VARCHAR(50),
        linkedin_url VARCHAR(255),
        portfolio_url VARCHAR(255),
        location VARCHAR(255),
        current_role VARCHAR(255),
        target_role VARCHAR(255),
        target_ctc VARCHAR(100),
        summary TEXT,
        skills JSONB DEFAULT '[]'::jsonb,
        experiences JSONB DEFAULT '[]'::jsonb,
        education JSONB DEFAULT '[]'::jsonb,
        certifications JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    client.release();
  } catch (err) {
    console.log(`[DB] PostgreSQL connection not active (${err.message}). Using persistent file-backed JSON store at server/data/career_store.json.`);
    isConnected = false;
  }
}

const db = {
  // ── Users & Accounts ──────────────────────────────────────────────────
  async getUsers() {
    return getMemoryStore().users || [];
  },

  async getUserByEmail(email) {
    const norm = (email || '').trim().toLowerCase();
    return (getMemoryStore().users || []).find(u => u.email?.toLowerCase() === norm) || null;
  },

  async getUserById(id) {
    return (getMemoryStore().users || []).find(u => u.id === id) || null;
  },

  async createUser(userData) {
    const store = getMemoryStore();
    if (!store.users) store.users = [];
    
    const newUser = {
      id: userData.id || ('usr-' + uuidv4().slice(0, 8)),
      full_name: userData.full_name || 'Executive Candidate',
      email: (userData.email || '').trim().toLowerCase(),
      password_hash: userData.password_hash || '',
      current_role: userData.current_role || 'Software Engineer',
      created_at: new Date().toISOString()
    };

    store.users.unshift(newUser);
    saveStore();
    return newUser;
  },

  // ── Resumes (User-Scoped) ──────────────────────────────────────────────
  async getMasterResume(userId = 'user-default-01') {
    const store = getMemoryStore();
    if (!store.resumes) store.resumes = [];

    let userResume = store.resumes.find(r => r.user_id === userId || (r.user_id === undefined && userId === 'user-default-01'));
    if (!userResume) {
      userResume = {
        id: 'res-' + uuidv4().slice(0, 8),
        user_id: userId,
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
      };
      store.resumes.unshift(userResume);
      saveStore();
    }
    return userResume;
  },

  async updateMasterResume(resumeData, userId = 'user-default-01') {
    const store = getMemoryStore();
    let resume = await this.getMasterResume(userId);

    // Merge changes
    Object.assign(resume, resumeData, {
      user_id: userId,
      updated_at: new Date().toISOString()
    });

    // Mark setup as true if name or experiences exist
    if (resume.full_name || (resume.experiences && resume.experiences.length > 0) || (resume.skills && resume.skills.length > 0)) {
      resume.is_profile_setup = true;
    }

    saveStore();
    return resume;
  },

  async updateResume(resumeData, userId = 'user-default-01') {
    return this.updateMasterResume(resumeData, userId);
  },

  // ── Job Applications (Kanban) ────────────────────────────────────────
  async getApplications(userId = 'user-default-01') {
    const store = getMemoryStore();
    return (store.job_applications || []).filter(a => !a.user_id || a.user_id === userId);
  },

  async createApplication(appData, userId = 'user-default-01') {
    const store = getMemoryStore();
    if (!store.job_applications) store.job_applications = [];

    const newApp = {
      id: appData.id || uuidv4(),
      user_id: userId,
      company_name: appData.company_name,
      job_title: appData.job_title,
      location: appData.location || 'Remote',
      salary_range: appData.salary_range || 'Competitive',
      status: appData.status || 'applied',
      notes: appData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.job_applications.unshift(newApp);
    saveStore();
    return newApp;
  },

  async updateApplicationStatus(id, status, notes) {
    const store = getMemoryStore();
    const item = (store.job_applications || []).find(a => a.id === id);
    if (item) {
      item.status = status;
      if (notes !== undefined) item.notes = notes;
      item.updated_at = new Date().toISOString();
      saveStore();
      return item;
    }
    return null;
  },

  async deleteApplication(id) {
    const store = getMemoryStore();
    if (!store.job_applications) return true;
    store.job_applications = store.job_applications.filter(a => a.id !== id);
    saveStore();
    return true;
  },

  // ── Networking Contacts ──────────────────────────────────────────────
  async getNetworkingContacts(userId = 'user-default-01') {
    const store = getMemoryStore();
    return (store.networking_contacts || []).filter(c => !c.user_id || c.user_id === userId);
  },

  async upsertNetworkingContact(contactData, userId = 'user-default-01') {
    const store = getMemoryStore();
    if (!store.networking_contacts) store.networking_contacts = [];

    const existing = store.networking_contacts.find(c => c.id === contactData.id);
    if (existing) {
      Object.assign(existing, contactData, { updated_at: new Date().toISOString() });
      saveStore();
      return existing;
    }

    const newContact = {
      id: contactData.id || uuidv4(),
      user_id: userId,
      name: contactData.name || '',
      title: contactData.title || '',
      company: contactData.company || '',
      linkedin_url: contactData.linkedin_url || '',
      avatar_initials: contactData.name ? contactData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??',
      kanban_status: contactData.kanban_status || 'queued',
      message_sequence: contactData.message_sequence || [],
      tags: contactData.tags || [],
      notes: contactData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.networking_contacts.unshift(newContact);
    saveStore();
    return newContact;
  },

  async updateContactStatus(id, kanban_status) {
    const store = getMemoryStore();
    const contact = (store.networking_contacts || []).find(c => c.id === id);
    if (contact) {
      contact.kanban_status = kanban_status;
      contact.updated_at = new Date().toISOString();
      saveStore();
      return contact;
    }
    return null;
  },

  async deleteNetworkingContact(id) {
    const store = getMemoryStore();
    if (!store.networking_contacts) return true;
    store.networking_contacts = store.networking_contacts.filter(c => c.id !== id);
    saveStore();
    return true;
  },

  // ── Relevant LinkedIn Profiles (Radar) ───────────────────────────────
  async getRelevantProfiles(userId = 'user-default-01') {
    const store = getMemoryStore();
    return (store.relevant_profiles || []).filter(p => !p.user_id || p.user_id === userId || p.user_id === 'user-default-01');
  },

  async upsertRelevantProfile(profileData, userId = 'user-default-01') {
    const store = getMemoryStore();
    if (!store.relevant_profiles) store.relevant_profiles = [];

    const normUrl = (profileData.linkedin_url || '').trim().toLowerCase().replace(/\/+$/, '');
    const existingIndex = store.relevant_profiles.findIndex(p =>
      (profileData.id && p.id === profileData.id) ||
      (normUrl && p.linkedin_url && p.linkedin_url.trim().toLowerCase().replace(/\/+$/, '') === normUrl)
    );

    if (existingIndex >= 0) {
      const existing = store.relevant_profiles[existingIndex];
      Object.assign(existing, profileData, { updated_at: new Date().toISOString() });
      saveStore();
      return existing;
    }

    const name = profileData.name || 'LinkedIn Professional';
    const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'LI';

    const newProfile = {
      id: profileData.id || uuidv4(),
      user_id: userId,
      name: name,
      handle: profileData.handle || (profileData.linkedin_url ? profileData.linkedin_url.split('/in/')[1]?.replace(/\/.*$/, '') : '') || '',
      linkedin_url: profileData.linkedin_url || '',
      title: profileData.title || profileData.current_role || 'Industry Specialist',
      company: profileData.company || 'Tech Leader',
      category_tag: profileData.category_tag || 'Role Model',
      avatar_initials: profileData.avatar_initials || initials,
      why_relevant: profileData.why_relevant || 'High-signal professional relevant to your career expansion and industry benchmark.',
      superpowers: profileData.superpowers && profileData.superpowers.length ? profileData.superpowers : [
        'Domain Expertise',
        'Industry Leadership',
        'High-Impact Networking Potential'
      ],
      outreach_hook: profileData.outreach_hook || 'Great work on your recent projects and insights.',
      key_learnings: profileData.key_learnings || 'Emulate their thought leadership and systematic execution.',
      notes: profileData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.relevant_profiles.unshift(newProfile);
    saveStore();
    return newProfile;
  },

  async deleteRelevantProfile(id) {
    const store = getMemoryStore();
    if (!store.relevant_profiles) return true;
    store.relevant_profiles = store.relevant_profiles.filter(p => p.id !== id);
    saveStore();
    return true;
  },

  // ── Targeted Job Roles Vault & Dream Jobs ───────────────────────────
  async getTargetJobs(userId = 'user-default-01') {
    const store = getMemoryStore();
    return (store.target_jobs || []).filter(j => !j.user_id || j.user_id === userId || j.user_id === 'user-default-01');
  },

  async upsertTargetJob(jobData, userId = 'user-default-01') {
    const store = getMemoryStore();
    if (!store.target_jobs) store.target_jobs = [];

    const normUrl = (jobData.job_url || '').trim().toLowerCase().replace(/\/+$/, '');
    const existingIndex = store.target_jobs.findIndex(j =>
      (jobData.id && j.id === jobData.id) ||
      (normUrl && j.job_url && j.job_url.trim().toLowerCase().replace(/\/+$/, '') === normUrl)
    );

    if (existingIndex >= 0) {
      const existing = store.target_jobs[existingIndex];
      Object.assign(existing, jobData, { updated_at: new Date().toISOString() });
      saveStore();
      return existing;
    }

    const newJob = {
      id: jobData.id || uuidv4(),
      user_id: userId,
      job_title: jobData.job_title || 'Target Role',
      company_name: jobData.company_name || 'Target Company',
      job_url: jobData.job_url || '',
      location: jobData.location || 'Remote / Hybrid',
      salary_range: jobData.salary_range || 'Competitive / Market Top',
      category: jobData.category || 'Target Dream Role',
      match_score: jobData.match_score || 88,
      why_targeted: jobData.why_targeted || 'High-signal target role aligned with your strategic career progression.',
      required_skills: jobData.required_skills || ['System Architecture', 'Core Domain Execution'],
      job_description: jobData.job_description || '',
      key_superpowers_needed: jobData.key_superpowers_needed || ['High-Impact Execution', 'Technical Leadership'],
      action_strategy: jobData.action_strategy || 'Tailor your master resume with Google XYZ bullets and reach out to team leads.',
      notes: jobData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.target_jobs.unshift(newJob);
    saveStore();
    return newJob;
  },

  async deleteTargetJob(id) {
    const store = getMemoryStore();
    if (!store.target_jobs) return true;
    store.target_jobs = store.target_jobs.filter(j => j.id !== id);
    saveStore();
    return true;
  },

  // ── LinkedIn OAuth ────────────────────────────────────────────────────
  async saveLinkedInToken(accessToken, memberId, userId = 'user-default-01') {
    const resume = await this.getMasterResume(userId);
    resume.linkedin_connected = true;
    resume.linkedin_access_token = accessToken;
    resume.linkedin_member_id = memberId;
    resume.updated_at = new Date().toISOString();
    saveStore();
    return resume;
  },

  async getLinkedInToken(userId = 'user-default-01') {
    const resume = await this.getMasterResume(userId);
    return {
      connected: resume.linkedin_connected,
      access_token: resume.linkedin_access_token,
      member_id: resume.linkedin_member_id
    };
  }
};

module.exports = {
  initDb,
  db,
  isDbConnected: () => isConnected,
};
