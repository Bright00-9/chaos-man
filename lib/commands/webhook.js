'use strict';

const express = require('express');
const crypto  = require('crypto');
const { execSync, exec } = require('child_process');
const chalk = require('chalk');

module.exports = function startWebhook(config, options = {}) {
  const app    = express();
  const PORT   = options.port   || config.webhook?.port   || 9000;
  const SECRET = options.secret || config.webhook?.secret || 'chaos_secret';
  const REPO   = config.repo_path || process.cwd();

  app.use(express.json({
    verify: (req, res, buf) => { req.rawBody = buf; }
  }));

  function verifySignature(req) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) return false;
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(req.rawBody);
    const digest = 'sha256=' + hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  }

  app.post('/webhook', (req, res) => {
    if (!verifySignature(req)) {
      console.log(chalk.red('[WEBHOOK] Invalid signature — rejected'));
      return res.status(401).send('Unauthorized');
    }

    const event = req.headers['x-github-event'];
    if (event !== 'push') {
      console.log(chalk.gray(`[WEBHOOK] Ignored event: ${event}`));
      return res.status(200).send('Ignored');
    }

    const branch = req.body.ref;
    const pusher = req.body.pusher?.name || 'unknown';
    const commit = req.body.head_commit?.message || 'no message';

    console.log(chalk.cyan(`\n[WEBHOOK] Push detected!`));
    console.log(`  Branch : ${branch}`);
    console.log(`  Pusher : ${pusher}`);
    console.log(`  Commit : ${commit}`);

    res.status(200).send('Webhook received');

    console.log(chalk.yellow('[WEBHOOK] Pulling latest code...'));
    try {
      execSync(`git -C ${REPO} pull`, { stdio: 'inherit' });
      console.log(chalk.green('[WEBHOOK] Code pulled. Launching chaos engine...'));

      exec(`cd ${REPO} && chaos-gitops run --no-dashboard`, (err, stdout) => {
        if (err) {
          console.error(chalk.red('[WEBHOOK] Chaos engine error:'), err.message);
          return;
        }
        console.log(stdout);
        console.log(chalk.green('[WEBHOOK] Chaos engine completed.'));
      });

    } catch (err) {
      console.error(chalk.red('[WEBHOOK] Git pull failed:'), err.message);
    }
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'chaos-gitops-webhook', repo: REPO, port: PORT });
  });

  app.listen(PORT, () => {
    console.log(chalk.green(`[WEBHOOK] Listening on port ${PORT}`));
    console.log(chalk.gray(`[WEBHOOK] Watching repo : ${REPO}`));
    console.log(chalk.gray(`[WEBHOOK] GitHub URL    : https://your-server:${PORT}/webhook\n`));
  });
};
