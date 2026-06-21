#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

function loadConfig(cliOptions = {}) {
  const configPath = path.join(process.cwd(), 'chaos.config.json');
  let fileConfig = {};

  if (fs.existsSync(configPath)) {
    fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(chalk.gray('  Config loaded from chaos.config.json'));
  }

  return {
    url:            cliOptions.url       || fileConfig.url       || 'http://localhost',
    port:           cliOptions.port      || fileConfig.port      || 3000,
    health:         cliOptions.health    || fileConfig.health    || '/health',
    dashboard:      cliOptions.dashboard !== false ? (fileConfig.dashboard !== false) : false,
    app:            fileConfig.app            || {},
    database:       fileConfig.database       || {},
    flood:          fileConfig.flood          || {},
    bad_inputs:     fileConfig.bad_inputs     || {},
    crash_recovery: fileConfig.crash_recovery || {},
    webhook:        fileConfig.webhook        || {},
    repo_path:      fileConfig.repo_path      || process.cwd(),
  };
}

function banner() {
  console.log(chalk.cyan(`
  ██████╗██╗  ██╗ █████╗  ██████╗ ███████╗
 ██╔════╝██║  ██║██╔══██╗██╔═══██╗██╔════╝
 ██║     ███████║███████║██║   ██║███████╗
 ██║     ██╔══██║██╔══██║██║   ██║╚════██║
 ╚██████╗██║  ██║██║  ██║╚██████╔╝███████║
  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
  `));
  console.log(chalk.bold('  GitOps Chaos Engineering Pipeline\n'));
}

program
  .name('chaos-man')
  .description('GitOps-driven chaos engineering pipeline with human approval gate')
  .version('1.1.0');

program
  .command('init')
  .description('Initialize chaos-man in your project')
  .action(() => {
    banner();
    require('../lib/commands/init')();
  });

program
  .command('run')
  .description('Run the full chaos engine against your app')
  .option('--url <url>',      'Base URL of your app')
  .option('--port <port>',    'Port your app runs on', parseInt)
  .option('--health <path>',  'Health check endpoint path')
  .option('--no-dashboard',   'Skip dashboard, run in CLI only')
  .action((options) => {
    banner();
    const config = loadConfig(options);
    require('../lib/commands/run')(config);
  });

program
  .command('webhook')
  .description('Start the webhook listener for GitOps integration')
  .option('--port <port>',     'Port to listen on', parseInt)
  .option('--secret <secret>', 'GitHub webhook secret')
  .action((options) => {
    banner();
    const config = loadConfig(options);
    require('../lib/commands/webhook')(config, options);
  });

program.parse(process.argv);
