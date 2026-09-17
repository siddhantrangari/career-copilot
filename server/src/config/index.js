const path = require('path');
// Prioritize production and local .env files with override: true
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.production'), override: true });
require('dotenv').config({ path: path.resolve(__dirname, '../../server/.env.production'), override: true });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });
require('dotenv').config({ path: path.resolve(__dirname, '../../server/.env'), override: true });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ override: true });

const config = {
  port: parseInt(process.env.PORT || '4005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:career_secret_2026@127.0.0.1:5438/career_copilot_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.CAREER_COPILOT_DB_PORT || '5438', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'career_secret_2026',
    database: process.env.DB_NAME || 'career_copilot_db',
  },
  ai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-5.6-sol',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '8000', 10),
  },
};

module.exports = config;
