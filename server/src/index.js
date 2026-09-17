const express = require('express');
const cors = require('cors');
const config = require('./config');
const { initDb } = require('./db/client');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Mount Routes
app.use('/api', apiRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Career Copilot API Server',
    version: '1.0.0',
    subdomain: 'career.myagentfirm.com',
    ai_model: config.ai.model,
    documentation: '/api/health'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Server Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Boot Sequence
async function startServer() {
  await initDb();

  app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Career Copilot API running on http://localhost:${config.port}`);
    console.log(`🧠 AI Engine Model: ${config.ai.model}`);
    console.log(`🌐 Subdomain target: career.myagentfirm.com`);
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('Fatal boot error:', err);
  process.exit(1);
});
