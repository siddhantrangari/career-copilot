const { db } = require('../db/client');
const https = require('https');

// LinkedIn OAuth config — reads from .env
const LI_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LI_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const LI_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:4000/api/linkedin/callback';
const LI_SCOPES = 'r_liteprofile r_emailaddress w_member_social';

// LinkedIn Voyager API base (internal web API — works with user OAuth token)
const VOYAGER_BASE = 'https://www.linkedin.com/voyager/api';

class LinkedInController {
  // ── Step 1: Redirect user to LinkedIn OAuth ─────────────────────────
  initiateOAuth(req, res) {
    if (!LI_CLIENT_ID) {
      return res.status(503).json({
        success: false,
        error: 'LinkedIn OAuth not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to .env'
      });
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LI_CLIENT_ID,
      redirect_uri: LI_REDIRECT_URI,
      scope: LI_SCOPES,
      state: 'career-copilot-' + Date.now()
    });

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
    res.json({ success: true, data: { auth_url: authUrl } });
  }

  // ── Step 2: Handle OAuth callback ───────────────────────────────────
  async handleCallback(req, res) {
    const { code, error, error_description } = req.query;

    if (error) {
      return res.redirect(`http://localhost:5173/?linkedin_error=${encodeURIComponent(error_description || error)}`);
    }

    try {
      // Exchange code for access token
      const tokenData = await this._exchangeToken(code);
      
      // Fetch LinkedIn member ID and basic profile
      const profile = await this._fetchLinkedInProfile(tokenData.access_token);
      
      // Save token to DB
      await db.saveLinkedInToken(tokenData.access_token, profile.id);

      // Redirect back to frontend with success
      res.redirect(`http://localhost:5173/?linkedin_connected=true&li_name=${encodeURIComponent(profile.localizedFirstName || '')}`);
    } catch (err) {
      console.error('[LinkedIn Callback Error]', err.message);
      res.redirect(`http://localhost:5173/?linkedin_error=${encodeURIComponent(err.message)}`);
    }
  }

  // ── Get LinkedIn connection status ───────────────────────────────────
  async getStatus(req, res) {
    try {
      const tokenData = await db.getLinkedInToken();
      const profile = await db.getMasterResume();
      const isConnected = !!(tokenData.connected || tokenData.access_token || profile.linkedin_url);
      res.json({
        success: true,
        data: {
          connected: isConnected,
          has_token: !!tokenData.access_token,
          linkedin_url: profile.linkedin_url || tokenData.linkedin_url || '',
          full_name: profile.full_name || tokenData.full_name || '',
          sync_mode: tokenData.access_token ? 'oauth_voyager' : 'smart_launch'
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Connect Profile directly (Instant Sync Mode) ──────────────────────
  async connectProfile(req, res) {
    try {
      const { linkedin_url, full_name } = req.body;
      if (!linkedin_url) {
        return res.status(400).json({ success: false, error: 'linkedin_url is required' });
      }

      const profile = await db.getMasterResume();
      profile.linkedin_connected = true;
      profile.linkedin_url = linkedin_url;
      if (full_name && !profile.full_name) profile.full_name = full_name;

      await db.saveLinkedInToken(null, null, {
        linkedin_url,
        full_name: profile.full_name || full_name,
        connected: true
      });

      res.json({
        success: true,
        data: {
          connected: true,
          linkedin_url,
          full_name: profile.full_name || full_name,
          sync_mode: 'smart_launch'
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Disconnect LinkedIn ──────────────────────────────────────────────
  async disconnect(req, res) {
    try {
      await db.saveLinkedInToken(null, null, { connected: false });
      const profile = await db.getMasterResume();
      profile.linkedin_connected = false;
      res.json({ success: true, data: { connected: false } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Send Connection Request via LinkedIn Voyager API ────────────────
  // NxtJob's approach: use the user's OAuth access token to call
  // LinkedIn's internal Voyager API to send connection requests + note
  async sendConnectionRequest(req, res) {
    const { target_linkedin_profile_id, message, target_name } = req.body;

    if (!target_linkedin_profile_id) {
      return res.status(400).json({ success: false, error: 'target_linkedin_profile_id required' });
    }

    try {
      const tokenData = await db.getLinkedInToken();

      if (!tokenData.connected || !tokenData.access_token) {
        return res.status(401).json({
          success: false,
          error: 'LinkedIn not connected. Please connect your LinkedIn account first.',
          action: 'connect_linkedin'
        });
      }

      // Call LinkedIn Voyager API to send connection request
      const result = await this._sendVoyagerInvitation(
        tokenData.access_token,
        target_linkedin_profile_id,
        message || ''
      );

      res.json({
        success: true,
        data: {
          sent: true,
          target_name,
          target_id: target_linkedin_profile_id,
          voyager_result: result
        }
      });
    } catch (err) {
      console.error('[sendConnectionRequest]', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── Private Helpers ──────────────────────────────────────────────────
  async _exchangeToken(code) {
    return new Promise((resolve, reject) => {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: LI_CLIENT_ID,
        client_secret: LI_CLIENT_SECRET,
        redirect_uri: LI_REDIRECT_URI
      }).toString();

      const options = {
        hostname: 'www.linkedin.com',
        path: '/oauth/v2/accessToken',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.access_token) resolve(parsed);
            else reject(new Error(parsed.error_description || 'Token exchange failed'));
          } catch (e) {
            reject(new Error('Invalid token response'));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async _fetchLinkedInProfile(accessToken) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.linkedin.com',
        path: '/v2/me',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      };

      const req = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Invalid profile response')); }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async _sendVoyagerInvitation(accessToken, profileId, message) {
    // LinkedIn Voyager API endpoint for sending invitations
    // This uses the same internal API the LinkedIn web app uses
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        invitee: {
          'com.linkedin.voyager.growth.invitation.InviteeProfile': {
            profileId
          }
        },
        message: message || '',
        trackingId: Buffer.from(Date.now().toString()).toString('base64')
      });

      const options = {
        hostname: 'www.linkedin.com',
        path: '/voyager/api/growth/normInvitations',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-li-lang': 'en_US',
          'x-li-track': JSON.stringify({ clientVersion: '1.13.7960', mpVersion: '1.13.7960' }),
          'csrf-token': 'ajax:' + Date.now(),
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          console.log('[Voyager] Status:', response.statusCode, data.slice(0, 200));
          resolve({ status: response.statusCode, body: data.slice(0, 500) });
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }
}

module.exports = new LinkedInController();
