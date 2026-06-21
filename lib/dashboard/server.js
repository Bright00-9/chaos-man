'use strict';

const express = require('express');
const path    = require('path');
const { exec } = require('child_process');

module.exports = function startDashboard(results, config = {}) {
  const app  = express();
  const PORT = 8080;

  app.use(express.json());
  app.use(express.static(path.join(__dirname)));

  app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify(results)}\n\n`);
    const keepAlive = setInterval(() => res.write(`: ping\n\n`), 15000);
    req.on('close', () => clearInterval(keepAlive));
  });

  app.post('/approve', (req, res) => {
    const { decision } = req.body;

    if (decision === 'approve') {
      const deployCmd = config.app?.deploy_command || 'bash ./deploy.sh';
      console.log(`[DASHBOARD] Deploying with: ${deployCmd}`);

      exec(deployCmd, { cwd: process.cwd() }, (err) => {
        if (err) {
          console.error('[DASHBOARD] Deploy failed:', err.message);
          return res.json({ success: false, message: `Deployment failed: ${err.message}` });
        }
        console.log('[DASHBOARD] Deployment successful!');
        res.json({ success: true, message: '🚀 Deployment successful!' });
      });

    } else {
      console.log('[DASHBOARD] Rejected by engineer.');
      res.json({ success: true, message: '🚫 Deployment rejected. Current version kept.' });
    }
  });

  app.get('/config', (req, res) => {
    res.json({
      stack:    config.app?.start_command || 'unknown',
      database: config.database?.type     || 'none',
      url:      config.url,
      port:     config.port
    });
  });

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`  Dashboard → http://localhost:${PORT}\n`);
  });
};
