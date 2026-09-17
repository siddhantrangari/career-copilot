const { db } = require('../db/client');
const aiService = require('../services/aiService');
const authController = require('./authController');

class CopilotController {
  // 1. Resume Studio Endpoints
  async getResume(req, res) {
    try {
      const userId = authController.extractUser(req);
      const resume = await db.getMasterResume(userId);
      res.json({ success: true, data: resume });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateResume(req, res) {
    try {
      const userId = authController.extractUser(req);
      const updated = await db.updateMasterResume(req.body, userId);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async optimizeBullet(req, res) {
    try {
      const { raw_bullet, role_context } = req.body;
      if (!raw_bullet) {
        return res.status(400).json({ success: false, error: 'raw_bullet is required' });
      }
      const result = await aiService.optimizeBulletPoint(raw_bullet, role_context);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // 2. ATS Scanner & Tailor Endpoints
  async scanAts(req, res) {
    try {
      const { resume_text, job_description, company_name, job_title } = req.body;
      if (!job_description) {
        return res.status(400).json({ success: false, error: 'job_description is required' });
      }

      let textToScan = resume_text;
      if (!textToScan) {
        const master = await db.getMasterResume();
        textToScan = `${master.full_name}\n${master.current_role}\n${master.summary}\nSkills: ${(master.skills || []).join(', ')}\nExperience:\n${JSON.stringify(master.experiences)}`;
      }

      const scanResult = await aiService.scanAtsMatch(textToScan, job_description, company_name, job_title);
      const savedAudit = await db.saveAtsAudit({
        company_name,
        job_title,
        job_description,
        ...scanResult
      });

      res.json({ success: true, data: savedAudit });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async tailorResume(req, res) {
    try {
      const { job_description, company_name, job_title } = req.body;
      if (!job_description) {
        return res.status(400).json({ success: false, error: 'job_description is required' });
      }

      const master = await db.getMasterResume();
      const tailored = await aiService.tailorResume(master, job_description, company_name, job_title);

      const savedTailored = await db.saveTailoredResume({
        company_name,
        job_title,
        tailored_markdown: tailored.tailored_summary,
        changes_summary: tailored.changes_summary,
        added_keywords: tailored.added_keywords,
        new_ats_score: tailored.new_ats_score,
        tailored_bullets_by_role: tailored.tailored_bullets_by_role
      });

      res.json({ success: true, data: { ...tailored, id: savedTailored.id } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // 3. Mock Interview Endpoints
  async getInterviewQuestions(req, res) {
    try {
      const { target_role, seniority_level, company } = req.query;
      const questionsData = await aiService.generateInterviewQuestions(
        target_role || 'VP of Engineering / Tech Lead',
        seniority_level || 'Senior / Lead',
        company || 'Tier 1 Tech'
      );
      res.json({ success: true, data: questionsData });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async evaluateInterview(req, res) {
    try {
      const { question, user_answer, target_role } = req.body;
      if (!user_answer || !question) {
        return res.status(400).json({ success: false, error: 'question and user_answer are required' });
      }

      const evaluation = await aiService.evaluateInterviewAnswer(question, user_answer, target_role);
      const savedInterview = await db.saveMockInterview({
        target_role: target_role || 'Engineering Leader',
        question,
        user_answer,
        ...evaluation
      });

      res.json({ success: true, data: savedInterview });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // 4. Job Applications Kanban Pipeline
  async getApplications(req, res) {
    try {
      const apps = await db.getApplications();
      res.json({ success: true, data: apps });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createApplication(req, res) {
    try {
      const { company_name, job_title, location, salary_range, status, notes } = req.body;
      if (!company_name || !job_title) {
        return res.status(400).json({ success: false, error: 'company_name and job_title are required' });
      }
      const newApp = await db.createApplication({ company_name, job_title, location, salary_range, status, notes });
      res.json({ success: true, data: newApp });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateApplicationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const updated = await db.updateApplicationStatus(id, status, notes);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // 5. Executive Tools (Pitcher, Negotiator, Networker)
  async generateSalaryStrategy(req, res) {
    try {
      const result = await aiService.generateSalaryNegotiation(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async generatePitchDeck(req, res) {
    try {
      const result = await aiService.generate306090Pitch(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async generateNetworkingMessage(req, res) {
    try {
      const result = await aiService.generateLinkedInOutreach(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async generateInfluencerPost(req, res) {
    try {
      const result = await aiService.generateInfluencerPost(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Resume Upload & AI Parse ────────────────────────────────────────
  async uploadAndParseResume(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No PDF file uploaded' });
      }

      // Extract text from PDF buffer
      let rawText = '';
      const pdfModule = require('pdf-parse');
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: req.file.buffer });
        try {
          const result = await parser.getText();
          rawText = result?.text || '';
        } finally {
          if (typeof parser.destroy === 'function') {
            await parser.destroy().catch(() => {});
          }
        }
      } else if (typeof pdfModule === 'function') {
        const pdfData = await pdfModule(req.file.buffer);
        rawText = pdfData?.text || '';
      } else if (typeof pdfModule.default === 'function') {
        const pdfData = await pdfModule.default(req.file.buffer);
        rawText = pdfData?.text || '';
      } else {
        throw new Error('Unsupported pdf-parse module interface');
      }

      if (!rawText || rawText.trim().length < 50) {
        return res.status(422).json({ success: false, error: 'Could not extract text from PDF. Please try a text-based (not scanned) PDF.' });
      }

      // Ask AI to extract structured profile
      const parsed = await aiService.parseResumeText(rawText);

      // Auto-save to DB for authenticated user
      const userId = authController.extractUser(req);
      const updated = await db.updateMasterResume({ ...parsed, is_profile_setup: true }, userId);

      res.json({ success: true, data: updated, raw_text_length: rawText.length });
    } catch (err) {
      console.error('[uploadAndParseResume]', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async parseLinkedInProfile(req, res) {
    try {
      const { linkedin_url, linkedin_text, about_text } = req.body;
      const rawText = linkedin_text || about_text || '';
      if (!linkedin_url && !rawText) {
        return res.status(400).json({ success: false, error: 'linkedin_url or profile text is required' });
      }

      // Extract structured profile via AI
      const parsed = await aiService.parseLinkedInProfileOrText(linkedin_url, rawText);
      const userId = authController.extractUser(req);
      const updated = await db.updateMasterResume({ ...parsed, linkedin_url: linkedin_url || parsed.linkedin_url, is_profile_setup: true }, userId);

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('[parseLinkedInProfile]', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteApplication(req, res) {
    try {
      const { id } = req.params;
      await db.deleteApplication(id);
      res.json({ success: true, data: { id } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async chatWithNova(req, res) {
    try {
      const { messages, message, activePage, targetJob } = req.body;
      
      let chatMessages = messages;
      if (!chatMessages || !Array.isArray(chatMessages)) {
        if (message && typeof message === 'string') {
          let userPrompt = message;
          if (targetJob) {
            userPrompt = `[Context: Target Job - ${targetJob.title || targetJob.job_title || ''} at ${targetJob.company || targetJob.company_name || ''}, Location: ${targetJob.location || ''}]\n\n${userPrompt}`;
          }
          chatMessages = [{ role: 'user', content: userPrompt }];
        } else {
          return res.status(400).json({ success: false, error: 'message or messages array is required' });
        }
      }

      const userId = authController.extractUser(req);
      const masterResume = await db.getMasterResume(userId);
      const result = await aiService.executeNovaChat({
        messages: chatMessages,
        masterResume,
        activePage: activePage || 'Job Board'
      });

      res.json({ 
        success: true, 
        data: {
          reply: result.reply,
          answer: result.reply,
          action_type: result.action_type,
          action_data: result.action_data,
          timestamp: result.timestamp
        }
      });
    } catch (err) {
      console.error('[chatWithNova]', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Target Job Roles Vault ──────────────────────────────────────────────
  async getTargetJobs(req, res) {
    try {
      const userId = authController.extractUser(req);
      const jobs = await db.getTargetJobs(userId);
      res.json({ success: true, data: jobs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async addTargetJob(req, res) {
    try {
      const { job_url, job_title, company_name, location, salary_range, category, why_targeted, required_skills, job_description, notes } = req.body;
      if (!job_url && !job_title) {
        return res.status(400).json({ success: false, error: 'job_url or job_title is required' });
      }

      const userId = authController.extractUser(req);
      let enrichedData = { job_url, job_title, company_name, location, salary_range, category, why_targeted, required_skills, job_description, notes };
      
      // If details are sparse, auto-enrich with AI
      if (!why_targeted || !job_description || !required_skills || required_skills.length === 0) {
        const userProfile = await db.getMasterResume(userId);
        const analysis = await aiService.analyzeTargetJobRole({
          job_url,
          job_title,
          company_name,
          job_description,
          notes,
          category,
          user_profile: userProfile
        });
        enrichedData = { ...analysis, ...enrichedData, notes: notes || analysis.notes };
      }

      const saved = await db.upsertTargetJob(enrichedData, userId);
      res.json({ success: true, data: saved });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async analyzeTargetJob(req, res) {
    try {
      const { job_url, job_title, company_name, job_description, notes, category } = req.body;
      if (!job_url && !job_title && !job_description) {
        return res.status(400).json({ success: false, error: 'job_url, job_title or job_description is required' });
      }

      const userId = authController.extractUser(req);
      const userProfile = await db.getMasterResume(userId);
      const analysis = await aiService.analyzeTargetJobRole({
        job_url,
        job_title,
        company_name,
        job_description,
        notes,
        category,
        user_profile: userProfile
      });

      res.json({ success: true, data: analysis });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteTargetJob(req, res) {
    try {
      const { id } = req.params;
      await db.deleteTargetJob(id);
      res.json({ success: true, data: { id } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Live Job Scraping & Boolean Matrix Endpoints ────────────────────────
  async getLiveJobs(req, res) {
    try {
      const { query, location, experience } = req.query;
      const jobs = await aiService.scrapeLiveJobs({ 
        query: query || 'AI Engineer', 
        location: location || 'Remote', 
        experience: experience || 'Mid-Senior' 
      });
      res.json({ success: true, data: jobs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getBooleanMatrix(req, res) {
    try {
      const { role, location, company } = req.query;
      const matrix = aiService.generate15AtsBooleanMatrix({ 
        role: role || 'AI Engineer', 
        location: location || 'Remote', 
        company: company || '' 
      });
      res.json({ success: true, data: matrix });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new CopilotController();


