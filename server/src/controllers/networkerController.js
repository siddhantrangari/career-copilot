const { db } = require('../db/client');
const aiService = require('../services/aiService');
const authController = require('./authController');

class NetworkerController {
  async getContacts(req, res) {
    try {
      const userId = authController.extractUser(req);
      const contacts = await db.getNetworkingContacts(userId);
      res.json({ success: true, data: contacts });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async addContact(req, res) {
    try {
      const { name, title, company, linkedin_url, tags, notes } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });

      const userId = authController.extractUser(req);
      const contact = await db.upsertNetworkingContact({ name, title, company, linkedin_url, tags, notes }, userId);
      res.json({ success: true, data: contact });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateContactStatus(req, res) {
    try {
      const { id } = req.params;
      const { kanban_status } = req.body;
      const userId = authController.extractUser(req);
      const updated = await db.updateContactStatus(id, kanban_status, userId);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteContact(req, res) {
    try {
      const { id } = req.params;
      const userId = authController.extractUser(req);
      await db.deleteNetworkingContact(id, userId);
      res.json({ success: true, data: { id } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Relevant LinkedIn Profiles ──────────────────────────────────────────
  async getRelevantProfiles(req, res) {
    try {
      const userId = authController.extractUser(req);
      const profiles = await db.getRelevantProfiles(userId);
      res.json({ success: true, data: profiles });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async addRelevantProfile(req, res) {
    try {
      const { linkedin_url, name, title, company, category_tag, notes, raw_text } = req.body;
      if (!linkedin_url && !name) {
        return res.status(400).json({ success: false, error: 'linkedin_url or name is required' });
      }

      const userId = authController.extractUser(req);
      let enrichedData = { linkedin_url, name, title, company, category_tag, notes };
      if (!title || !notes || raw_text) {
        const analysis = await aiService.analyzeRelevantLinkedInProfile({
          linkedin_url,
          name,
          title,
          company,
          category_tag,
          notes,
          raw_text
        });
        enrichedData = { ...analysis, ...enrichedData, notes: notes || analysis.notes };
      }

      const saved = await db.upsertRelevantProfile(enrichedData, userId);
      res.json({ success: true, data: saved });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async analyzeRelevantProfile(req, res) {
    try {
      const { linkedin_url, name, notes, category_tag, raw_text } = req.body;
      if (!linkedin_url && !name && !raw_text) {
        return res.status(400).json({ success: false, error: 'LinkedIn URL, name or profile text is required' });
      }

      const userProfile = await db.getMasterResume();
      const analysis = await aiService.analyzeRelevantLinkedInProfile({
        linkedin_url,
        name,
        notes,
        category_tag,
        raw_text,
        user_profile: userProfile
      });

      res.json({ success: true, data: analysis });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteRelevantProfile(req, res) {
    try {
      const { id } = req.params;
      await db.deleteRelevantProfile(id);
      res.json({ success: true, data: { id } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async generateSequence(req, res) {
    try {
      const { target_name, target_title, target_company, shared_context, contact_type, my_role, my_background } = req.body;

      if (!target_name || !target_company) {
        return res.status(400).json({ success: false, error: 'target_name and target_company are required' });
      }

      // Get user's profile for personalisation
      const profile = await db.getMasterResume();
      const senderName = profile.full_name || 'me';
      const senderRole = profile.current_role || my_role || '';
      const senderBackground = my_background || profile.summary || '';

      const sequence = await aiService.generateNetworkingSequence({
        target_name,
        target_title,
        target_company,
        shared_context,
        contact_type,
        sender_name: senderName,
        sender_role: senderRole,
        sender_background: senderBackground
      });

      res.json({ success: true, data: sequence });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async generateSearchQuery(req, res) {
    try {
      const { target_role, target_company, seniority, location } = req.body;
      if (!target_role) return res.status(400).json({ success: false, error: 'target_role is required' });

      const result = await aiService.generateLinkedInSearchQuery({ target_role, target_company, seniority, location });
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async searchCompany(req, res) {
    try {
      const { company_name, target_role, location } = req.body;
      if (!company_name) return res.status(400).json({ success: false, error: 'company_name is required' });

      const profile = await db.getMasterResume();
      const role = target_role || profile.target_role || profile.current_role || 'Senior Software Engineer';
      const loc = location || profile.location || '';

      const intelligence = await aiService.searchCompanyIntelligence({
        company_name,
        target_role: role,
        location: loc
      });
      res.json({ success: true, data: intelligence });
    } catch (err) {
      console.error('[searchCompany]', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new NetworkerController();
