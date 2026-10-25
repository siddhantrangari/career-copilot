import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '../..');

// Only load .env.production when actually running in production. Both files
// exist on a dev machine, and letting the production one override would point
// local work straight at the live database.
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.join(ROOT_DIR, '.env.production') });
}
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const int = (value, fallback) => {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: int(process.env.PORT, 4010),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  rootDir: ROOT_DIR,

  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:career_secret_2026@127.0.0.1:5438/career_copilot_os',
  },

  ai: {
    // Failover chain, highest priority first.
    order: (process.env.AI_PROVIDER_ORDER || 'mesh,openai')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    maxTokens: int(process.env.AI_MAX_TOKENS, 8000),

    mesh: {
      apiKey: process.env.MESH_API_KEY || '',
      model: process.env.MESH_MODEL || 'anthropic/claude-sonnet-4-6',
      baseUrl: process.env.MESH_BASE_URL || 'https://api.meshapi.ai/v1',
    },

    // Live web search. Perplexity's sonar models run a real search per
    // request and return citations — this is what grounds research and
    // WIN documents in current reality rather than training memory.
    search: {
      enabled: process.env.RESEARCH_LIVE_SEARCH !== 'false',
      model: process.env.MESH_SEARCH_MODEL || 'perplexity/sonar-pro',
      maxAgeDays: parseInt(process.env.RESEARCH_MAX_AGE_DAYS || '7', 10) || 7,
    },

    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-5.6-sol',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    },
  },

  // Text to speech for the interview simulator. See services/tts.js for the
  // cost ladder; default is the cheap Mesh voice with a browser fallback.
  tts: {
    // Free by default. A paid voice is opt-in per interview from the UI.
    provider: process.env.TTS_PROVIDER || 'browser', // browser | mesh | elevenlabs | auto
    meshModel: process.env.TTS_MESH_MODEL || 'x-ai/tts-v1',
    elevenLabsKey: process.env.ELEVENLABS_API_KEY || '',
    elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
    elevenLabsModel: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
  },

  // Cheap model for live interview turns — these are short, frequent and
  // latency-sensitive, so the expensive model is reserved for planning and
  // the final report.
  interview: {
    // gpt-5.6-luna throughout, measured rather than assumed:
    //  - turns: sharper questions than gpt-4o-mini, and cheaper once prompt
    //    caching warms ($0.02/1M cached input vs $0.075).
    //  - plan and report: report quality matched claude-sonnet-4-6 on the
    //    things that matter (caught the deflection, quoted real evidence,
    //    named unused achievements) at $0.002 instead of $0.055.
    // Set these to anthropic/claude-sonnet-4-6 to trade cost back for depth.
    turnModel: process.env.INTERVIEW_TURN_MODEL || 'openai/gpt-5.6-luna',
    planModel: process.env.INTERVIEW_PLAN_MODEL || 'openai/gpt-5.6-luna',
    reportModel: process.env.INTERVIEW_REPORT_MODEL || 'openai/gpt-5.6-luna',
  },

  // Cloudflare R2 — interview recordings are moved here off the VPS disk.
  // Unset means recordings simply stay on the VPS and remain playable.
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || 'career-copilot',
    prefix: process.env.R2_PREFIX || 'interviews',
  },

  // Job discovery agent. Polls public ATS boards (free), so the interval can
  // be short without cost concerns.
  discovery: {
    enabled: process.env.DISCOVERY_ENABLED !== 'false',
    intervalHours: int(process.env.DISCOVERY_INTERVAL_HOURS, 6),
    minRelevance: int(process.env.DISCOVERY_MIN_RELEVANCE, 40),
    // Freelance gig sources. Remotive asks for at most 4 calls a day, so the
    // floor is 6h regardless of what the env says.
    gigIntervalHours: Math.max(6, int(process.env.GIG_DISCOVERY_INTERVAL_HOURS, 6)),
  },

  // Morning digest — one Telegram message a day: fresh high-match roles,
  // follow-ups due, interviews this week. Silent until both Telegram values
  // are set, so a missing token never turns into a failing job.
  digest: {
    enabled: process.env.DIGEST_ENABLED !== 'false',
    hour: int(process.env.DIGEST_HOUR, 8),
    minute: int(process.env.DIGEST_MINUTE, 0),
    timeZone: process.env.DIGEST_TZ || 'Asia/Kolkata',
    minRelevance: int(process.env.DIGEST_MIN_RELEVANCE, 75),
    maxJobs: int(process.env.DIGEST_MAX_JOBS, 10),
    appUrl: (process.env.APP_URL || 'https://career.myagentfirm.com').replace(/\/$/, ''),
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
      // Only overridden to point tests at a local stand-in.
      apiBase: (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/$/, ''),
    },
  },

  // India discovery: Workday + SmartRecruiters public APIs need no key; the
  // aggregators stay off until their key is set.
  india: {
    enabled: process.env.INDIA_DISCOVERY_ENABLED !== 'false',
    intervalHours: Math.max(6, int(process.env.INDIA_DISCOVERY_INTERVAL_HOURS, 12)),
    adzuna: { appId: process.env.ADZUNA_APP_ID || '', appKey: process.env.ADZUNA_APP_KEY || '' },
    jsearch: { apiKey: process.env.JSEARCH_API_KEY || '', host: process.env.JSEARCH_HOST || 'jsearch.p.rapidapi.com' },
  },

  // Telegram assistant — chat with the whole app from the same bot that
  // sends the digest. Answers only TELEGRAM_CHAT_ID.
  bot: {
    enabled: process.env.BOT_ENABLED !== 'false',
    model: process.env.BOT_MODEL || 'openai/gpt-5.6-luna',
    maxToolRounds: int(process.env.BOT_MAX_TOOL_ROUNDS, 8),
    historyMessages: int(process.env.BOT_HISTORY_MESSAGES, 12), // text messages only (6 exchanges)
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'career_copilot_os_dev_secret',
    email: (process.env.APP_USER_EMAIL || 'siddhantrangari@gmail.com').toLowerCase(),
    password: process.env.APP_USER_PASSWORD || 'siddhant',
    // Single-user tool: everything is owned by this fixed id.
    userId: 'siddhant',
  },
};
