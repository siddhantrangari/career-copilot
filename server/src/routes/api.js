const express = require('express');
const router = express.Router();
const multer = require('multer');
const controller = require('../controllers/copilotController');
const networkerController = require('../controllers/networkerController');
const linkedInController = require('../controllers/linkedInController');
const authController = require('../controllers/authController');

// Multer: memory storage for PDF uploads (no disk write)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted'), false);
  }
});

// ── Authentication & User Profiles ───────────────────────────────────────
router.post('/auth/signup', (req, res) => authController.signup(req, res));
router.post('/auth/login', (req, res) => authController.login(req, res));
router.post('/auth/demo-login', (req, res) => authController.demoLogin(req, res));
router.get('/auth/me', (req, res) => authController.getMe(req, res));

// ── Health Check ─────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Career Copilot Engine',
    model: process.env.OPENAI_MODEL || 'gpt-5.6-sol',
    timestamp: new Date().toISOString()
  });
});

// ── 0. Nova Executive Copilot (Autonomous Strategist) ────────────────────
router.post('/nova/chat', (req, res) => controller.chatWithNova(req, res));

// ── 1. Resume Studio ─────────────────────────────────────────────────────
router.get('/resume', (req, res) => controller.getResume(req, res));
router.put('/resume', (req, res) => controller.updateResume(req, res));
router.post('/resume/optimize-bullet', (req, res) => controller.optimizeBullet(req, res));

// Resume upload & AI parse (PDF → structured profile)
router.post('/resume/upload', upload.single('resume'), (req, res) => controller.uploadAndParseResume(req, res));

// LinkedIn profile URL → AI extract profile
router.post('/resume/parse-linkedin', (req, res) => controller.parseLinkedInProfile(req, res));

// ── 2. ATS Scanner & Tailor ──────────────────────────────────────────────
router.post('/ats/scan', (req, res) => controller.scanAts(req, res));
router.post('/ats/tailor', (req, res) => controller.tailorResume(req, res));

// ── 3. Mock Interview ────────────────────────────────────────────────────
router.get('/interview/questions', (req, res) => controller.getInterviewQuestions(req, res));
router.post('/interview/evaluate', (req, res) => controller.evaluateInterview(req, res));

// ── 4. Job Application Pipeline (Kanban) ────────────────────────────────
router.get('/applications', (req, res) => controller.getApplications(req, res));
router.post('/applications', (req, res) => controller.createApplication(req, res));
router.patch('/applications/:id/status', (req, res) => controller.updateApplicationStatus(req, res));
router.delete('/applications/:id', (req, res) => controller.deleteApplication(req, res));

// ── 5. Executive Career Tools ────────────────────────────────────────────
router.post('/tools/negotiate', (req, res) => controller.generateSalaryStrategy(req, res));
router.post('/tools/pitch-deck', (req, res) => controller.generatePitchDeck(req, res));
router.post('/tools/influencer', (req, res) => controller.generateInfluencerPost(req, res));

// ── 5.1 Target Job Roles & Dream Jobs Vault ─────────────────────────────
router.get('/target-jobs', (req, res) => controller.getTargetJobs(req, res));
router.post('/target-jobs', (req, res) => controller.addTargetJob(req, res));
router.post('/target-jobs/analyze', (req, res) => controller.analyzeTargetJob(req, res));
router.delete('/target-jobs/:id', (req, res) => controller.deleteTargetJob(req, res));

// ── 6. Networker Agent ───────────────────────────────────────────────────
router.get('/networking/contacts', (req, res) => networkerController.getContacts(req, res));
router.post('/networking/contacts', (req, res) => networkerController.addContact(req, res));
router.patch('/networking/contacts/:id/status', (req, res) => networkerController.updateContactStatus(req, res));
router.delete('/networking/contacts/:id', (req, res) => networkerController.deleteContact(req, res));

// Relevant LinkedIn Profiles Radar
router.get('/networking/relevant-profiles', (req, res) => networkerController.getRelevantProfiles(req, res));
router.post('/networking/relevant-profiles', (req, res) => networkerController.addRelevantProfile(req, res));
router.post('/networking/relevant-profiles/analyze', (req, res) => networkerController.analyzeRelevantProfile(req, res));
router.delete('/networking/relevant-profiles/:id', (req, res) => networkerController.deleteRelevantProfile(req, res));

// AI: Generate 3-level message sequence
router.post('/networking/generate-sequence', (req, res) => networkerController.generateSequence(req, res));
// AI: Real-time Company & Decision Maker Intelligence Search
router.post('/networking/company-search', (req, res) => networkerController.searchCompany(req, res));
// AI: Generate LinkedIn Boolean search query
router.post('/networking/search-query', (req, res) => networkerController.generateSearchQuery(req, res));
// Send connection request via LinkedIn Voyager API (requires OAuth token)
router.post('/networking/send-connection', (req, res) => linkedInController.sendConnectionRequest(req, res));

// ── 7. Live Jobs Scraping & 15-ATS Boolean Matrix ──────────────────────────
router.get('/jobs/live', (req, res) => controller.getLiveJobs(req, res));
router.get('/jobs/boolean-matrix', (req, res) => controller.getBooleanMatrix(req, res));

// ── 8. LinkedIn Integration ──────────────────────────────────────────────
router.get('/linkedin/auth', (req, res) => linkedInController.initiateOAuth(req, res));
router.get('/linkedin/callback', (req, res) => linkedInController.handleCallback(req, res));
router.get('/linkedin/status', (req, res) => linkedInController.getStatus(req, res));
router.post('/linkedin/connect-profile', (req, res) => linkedInController.connectProfile(req, res));
router.post('/linkedin/disconnect', (req, res) => linkedInController.disconnect(req, res));

module.exports = router;

