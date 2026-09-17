const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('career_copilot_auth_token');
  const user = localStorage.getItem('career_copilot_user');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (user) {
    try {
      const parsed = JSON.parse(user);
      if (parsed.id) headers['x-user-id'] = parsed.id;
    } catch (e) {}
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
    return data.data !== undefined ? data.data : data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

// Multipart form upload (no Content-Type header — browser sets boundary)
async function upload(endpoint, formData) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...getAuthHeaders()
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
    return data.data !== undefined ? data.data : data;
  } catch (err) {
    console.error(`Upload Error [${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  // ── Authentication & User Profiles ──────────────────────────────────
  signup: (payload) => request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  demoLogin: () => request('/auth/demo-login', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // ── Nova AI Copilot & Knowledge Strategist ──────────────────────────
  chatWithNova: (payload) =>
    request('/nova/chat', { method: 'POST', body: JSON.stringify(payload) }),
  sendNovaMessage: (message, context = {}) =>
    request('/nova/chat', { method: 'POST', body: JSON.stringify({ message, ...context }) }),

  // ── Resume & Profile ────────────────────────────────────────────────
  getMasterResume: () => request('/resume'),
  updateMasterResume: (data) => request('/resume', { method: 'PUT', body: JSON.stringify(data) }),
  optimizeBullet: (raw_bullet, role_context) =>
    request('/resume/optimize-bullet', { method: 'POST', body: JSON.stringify({ raw_bullet, role_context }) }),
  uploadResumePdf: (file) => {
    const fd = new FormData();
    fd.append('resume', file);
    return upload('/resume/upload', fd);
  },
  parseLinkedInProfile: (linkedin_url) =>
    request('/resume/parse-linkedin', { method: 'POST', body: JSON.stringify({ linkedin_url }) }),

  // ── ATS Scanner & Tailor ────────────────────────────────────────────
  scanAtsMatch: (payload) => request('/ats/scan', { method: 'POST', body: JSON.stringify(payload) }),
  tailorResume: (payload) => request('/ats/tailor', { method: 'POST', body: JSON.stringify(payload) }),

  // ── Mock Interview ──────────────────────────────────────────────────
  getInterviewQuestions: (params = {}) =>
    request(`/interview/questions?${new URLSearchParams(params)}`),
  evaluateAnswer: (payload) =>
    request('/interview/evaluate', { method: 'POST', body: JSON.stringify(payload) }),

  // ── Job Applications Kanban ─────────────────────────────────────────
  getApplications: () => request('/applications'),
  createApplication: (payload) =>
    request('/applications', { method: 'POST', body: JSON.stringify(payload) }),
  updateApplicationStatus: (id, status, notes) =>
    request(`/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  deleteApplication: (id) => request(`/applications/${id}`, { method: 'DELETE' }),

  // ── Executive Tools ─────────────────────────────────────────────────
  generateSalaryStrategy: (payload) =>
    request('/tools/negotiate', { method: 'POST', body: JSON.stringify(payload) }),
  generatePitchDeck: (payload) =>
    request('/tools/pitch-deck', { method: 'POST', body: JSON.stringify(payload) }),
  generateInfluencerPost: (payload) =>
    request('/tools/influencer', { method: 'POST', body: JSON.stringify(payload) }),

  // ── Networker Agent & Company Intelligence ──────────────────────────
  getNetworkingContacts: () => request('/networking/contacts'),
  addNetworkingContact: (payload) =>
    request('/networking/contacts', { method: 'POST', body: JSON.stringify(payload) }),
  updateContactStatus: (id, kanban_status) =>
    request(`/networking/contacts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ kanban_status }) }),
  deleteNetworkingContact: (id) => request(`/networking/contacts/${id}`, { method: 'DELETE' }),

  // ── Relevant LinkedIn Profiles Radar ────────────────────────────────
  getRelevantProfiles: () => request('/networking/relevant-profiles'),
  addRelevantProfile: (payload) =>
    request('/networking/relevant-profiles', { method: 'POST', body: JSON.stringify(payload) }),
  analyzeRelevantProfile: (payload) =>
    request('/networking/relevant-profiles/analyze', { method: 'POST', body: JSON.stringify(payload) }),
  deleteRelevantProfile: (id) => request(`/networking/relevant-profiles/${id}`, { method: 'DELETE' }),
  generateNetworkingSequence: (payload) =>
    request('/networking/generate-sequence', { method: 'POST', body: JSON.stringify(payload) }),
  searchCompany: (payload) =>
    request('/networking/company-search', { method: 'POST', body: JSON.stringify(payload) }),
  generateLinkedInSearchQuery: (payload) =>
    request('/networking/search-query', { method: 'POST', body: JSON.stringify(payload) }),
  sendLinkedInConnection: (payload) =>
    request('/networking/send-connection', { method: 'POST', body: JSON.stringify(payload) }),

  // ── Target Job Roles & Dream Jobs Vault ─────────────────────────────
  getTargetJobs: () => request('/target-jobs'),
  addTargetJob: (payload) =>
    request('/target-jobs', { method: 'POST', body: JSON.stringify(payload) }),
  analyzeTargetJob: (payload) =>
    request('/target-jobs/analyze', { method: 'POST', body: JSON.stringify(payload) }),
  deleteTargetJob: (id) => request(`/target-jobs/${id}`, { method: 'DELETE' }),

  // ── Live Job Scraping & 15-ATS Boolean Search Matrix ────────────────
  getLiveJobs: (params = {}) =>
    request(`/jobs/live?${new URLSearchParams(params)}`),
  getBooleanMatrix: (params = {}) =>
    request(`/jobs/boolean-matrix?${new URLSearchParams(params)}`),

  // ── LinkedIn Integration ─────────────────────────────────────────────
  getLinkedInAuthUrl: () => request('/linkedin/auth'),
  getLinkedInStatus: () => request('/linkedin/status'),
  connectLinkedInProfile: (payload) =>
    request('/linkedin/connect-profile', { method: 'POST', body: JSON.stringify(payload) }),
  disconnectLinkedIn: () => request('/linkedin/disconnect', { method: 'POST' }),
};

