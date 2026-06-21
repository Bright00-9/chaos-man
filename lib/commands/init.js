'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = function init() {
  console.log(chalk.cyan('  Initializing chaos-man in your project...\n'));

  const configPath = path.join(process.cwd(), 'chaos.config.json');

  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow('  chaos.config.json already exists. Skipping.'));
    return;
  }

  const config = {
    url:       'http://localhost',
    port:      4000,
    health:    '/health',
    dashboard: true,
    repo_path: process.cwd(),

    app: {
      start_command:  'node app.js',
      stop_command:   'pkill -f "node app.js"',
      deploy_command: 'git pull && npm install',
      ready_wait:     3
    },

    database: {
      enabled:        true,
      type:           'redis',
      stop_command:   'sudo service redis-server stop',
      start_command:  'sudo service redis-server start',
      check_command:  'redis-cli ping',
      check_expected: 'PONG'
    },

    flood: {
      enabled:   true,
      requests:  100,
      pass_rate: 90
    },

    bad_inputs: {
      enabled:  true,
      endpoint: '/api/endpoint',
      field:    'input'
    },

    crash_recovery: {
      enabled: true
    },

    webhook: {
      port:   9000,
      secret: 'your_github_webhook_secret'
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log(chalk.green('  ✅ chaos.config.json created!\n'));
  console.log(chalk.white('  Stack examples:\n'));
  console.log(chalk.gray('  Node.js + Redis:'));
  console.log(chalk.gray('    start_command:  "node app.js"'));
  console.log(chalk.gray('    db type:        "redis"\n'));
  console.log(chalk.gray('  Python/Django + PostgreSQL:'));
  console.log(chalk.gray('    start_command:  "python manage.py runserver"'));
  console.log(chalk.gray('    db type:        "postgres"\n'));
  console.log(chalk.gray('  Go + MySQL:'));
  console.log(chalk.gray('    start_command:  "./main"'));
  console.log(chalk.gray('    db type:        "mysql"\n'));
  console.log(chalk.gray('  Java/Spring + MongoDB:'));
  console.log(chalk.gray('    start_command:  "java -jar app.jar"'));
  console.log(chalk.gray('    db type:        "mongodb"\n'));
  console.log(chalk.gray('  Edit chaos.config.json then run: chaos-man run\n'));
};
