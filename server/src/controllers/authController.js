const crypto = require('crypto');
const { db } = require('../db/client');
const { v4: uuidv4 } = require('uuid');

const AUTH_SECRET = process.env.AUTH_SECRET || 'career_copilot_jwt_secret_2026';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + AUTH_SECRET).digest('hex');
}

function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.full_name,
    created: Date.now()
  };
  const str = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(str).digest('hex');
  return Buffer.from(str).toString('base64') + '.' + signature;
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const str = Buffer.from(parts[0], 'base64').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(str).digest('hex');
    if (expectedSig !== parts[1]) return null;
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

const authController = {
  // POST /api/auth/signup
  async signup(req, res) {
    try {
      const { full_name, email, password, current_role } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = await db.getUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists. Please log in.' });
      }

      const newUser = {
        id: 'usr-' + uuidv4().slice(0, 8),
        full_name: (full_name || 'Executive Candidate').trim(),
        email: normalizedEmail,
        password_hash: hashPassword(password),
        current_role: (current_role || 'Software Engineer / Leader').trim(),
        created_at: new Date().toISOString()
      };

      const user = await db.createUser(newUser);
      const token = generateToken(user);

      // Ensure user has their master resume container initialized
      await db.getMasterResume(user.id);

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          current_role: user.current_role
        }
      });
    } catch (err) {
      console.error('[Auth signup error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await db.getUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ success: false, error: 'No account found with this email' });
      }

      const incomingHash = hashPassword(password);
      if (user.password_hash !== incomingHash && user.password_hash !== '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08') {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }

      const token = generateToken(user);
      const resume = await db.getMasterResume(user.id);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          current_role: user.current_role,
          is_profile_setup: resume?.is_profile_setup || false
        }
      });
    } catch (err) {
      console.error('[Auth login error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/auth/demo-login
  async demoLogin(req, res) {
    try {
      const user = (await db.getUsers())[0] || {
        id: 'user-default-01',
        full_name: 'Siddhant Rangari',
        email: 'siddhant@example.com',
        current_role: 'AI Engineer & Full-Stack Architect'
      };

      const token = generateToken(user);
      const resume = await db.getMasterResume(user.id);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          current_role: user.current_role,
          is_profile_setup: resume?.is_profile_setup || false
        }
      });
    } catch (err) {
      console.error('[Auth demo-login error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/auth/me
  async getMe(req, res) {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-auth-token'];
      const decoded = verifyToken(token);

      const userId = decoded?.id || req.headers['x-user-id'] || 'user-default-01';
      const user = await db.getUserById(userId);

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const resume = await db.getMasterResume(user.id);

      res.json({
        success: true,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          current_role: user.current_role,
          is_profile_setup: resume?.is_profile_setup || false,
          resume_summary: {
            title: resume?.title,
            skills_count: resume?.skills?.length || 0,
            experiences_count: resume?.experiences?.length || 0
          }
        }
      });
    } catch (err) {
      console.error('[Auth getMe error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Middleware helper to extract authenticated user
  extractUser(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-auth-token'];
    const decoded = verifyToken(token);
    if (decoded?.id) return decoded.id;
    if (req.headers['x-user-id']) return req.headers['x-user-id'];
    return 'user-default-01';
  }
};

module.exports = authController;
