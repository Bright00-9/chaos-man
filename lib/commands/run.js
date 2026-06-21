'use strict';

const chalk = require('chalk');
const axios = require('axios');
const ora   = require('ora');
const { exec } = require('child_process');
const fs   = require('fs');
const path = require('path');

function runCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      resolve({ err, stdout: stdout?.trim(), stderr: stderr?.trim() });
    });
  });
}

function wait(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function floodTest(config) {
  if (!config.flood?.enabled) return null;

  const spinner   = ora('Running traffic flood test...').start();
  const url       = `${config.url}:${config.port}${config.health}`;
  const total     = config.flood.requests  || 100;
  const threshold = config.flood.pass_rate || 90;
  let pass = 0, fail = 0;

  for (let i = 0; i < total; i++) {
    try {
      const res = await axios.get(url, { timeout: 3000 });
      res.status === 200 ? pass++ : fail++;
    } catch { fail++; }
  }

  const rate   = Math.round((pass / total) * 100);
  const passed = rate >= threshold;

  passed
    ? spinner.succeed(chalk.green(`Traffic Flood: ${pass}/${total} succeeded (${rate}%)`))
    : spinner.fail(chalk.red(`Traffic Flood: Only ${rate}% succeeded (threshold: ${threshold}%)`));

  return {
    name:   'Traffic Flood',
    status: passed ? 'PASS' : 'FAIL',
    detail: `${rate}% success rate (${pass}/${total} requests)`
  };
}

async function badInputsTest(config) {
  if (!config.bad_inputs?.enabled) return null;

  const spinner  = ora('Running bad inputs test...').start();
  const endpoint = `${config.url}:${config.port}${config.bad_inputs.endpoint || '/'}`;
  const field    = config.bad_inputs.field || 'input';

  const badInputs = [
    { label: 'Empty body',           data: {} },
    { label: 'Wrong field name',     data: { wrong_field: 'value' } },
    { label: 'SQL injection',        data: { [field]: "' OR 1=1--" } },
    { label: 'Script injection',     data: { [field]: '<script>alert(1)</script>' } },
    { label: 'Null value',           data: { [field]: null } },
    { label: 'Number not string',    data: { [field]: 12345 } },
    { label: 'Empty string',         data: { [field]: '' } },
    { label: 'Extremely long input', data: { [field]: 'A'.repeat(5000) } },
  ];

  let pass = 0, fail = 0;

  for (const input of badInputs) {
    try {
      const res = await axios.post(endpoint, input.data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 3000,
        validateStatus: () => true
      });
      res.status !== 500 ? pass++ : fail++;
    } catch { fail++; }
  }

  const passed = fail === 0;

  passed
    ? spinner.succeed(chalk.green(`Bad Inputs: All ${badInputs.length} handled gracefully`))
    : spinner.fail(chalk.red(`Bad Inputs: ${fail} inputs caused server crashes`));

  return {
    name:   'Bad Inputs',
    status: passed ? 'PASS' : 'FAIL',
    detail: `${pass}/${badInputs.length} handled without server crash`
  };
}

async function crashRecoveryTest(config) {
  if (!config.crash_recovery?.enabled) return null;

  const spinner   = ora('Running crash & recovery test...').start();
  const stopCmd   = config.app.stop_command;
  const startCmd  = config.app.start_command;
  const readyWait = config.app.ready_wait || 3;
  const healthUrl = `${config.url}:${config.port}${config.health}`;

  await runCommand(stopCmd);
  await wait(2);

  let downConfirmed = false;
  try {
    await axios.get(healthUrl, { timeout: 2000 });
  } catch {
    downConfirmed = true;
  }

  exec(startCmd);
  await wait(readyWait);

  let recovered = false;
  try {
    const res = await axios.get(healthUrl, { timeout: 3000 });
    recovered = res.status === 200;
  } catch { recovered = false; }

  const passed = downConfirmed && recovered;

  passed
    ? spinner.succeed(chalk.green(`Crash Recovery: App restarted successfully`))
    : spinner.fail(chalk.red(`Crash Recovery: App failed to recover`));

  return {
    name:   'Crash Recovery',
    status: passed ? 'PASS' : 'FAIL',
    detail: recovered
      ? `App recovered using: ${startCmd}`
      : `App did not recover. Check start_command in chaos.config.json`
  };
}

async function databaseChaosTest(config) {
  if (!config.database?.enabled) return null;

  const db      = config.database;
  const spinner = ora(`Running ${db.type} chaos test...`).start();
  const healthUrl = `${config.url}:${config.port}${config.health}`;

  await runCommand(db.stop_command);
  await wait(2);

  try {
    await axios.get(healthUrl, { timeout: 3000, validateStatus: () => true });
  } catch { /* expected */ }

  await runCommand(db.start_command);
  await wait(2);

  const { stdout } = await runCommand(db.check_command);
  const recovered  = stdout === db.check_expected;

  recovered
    ? spinner.succeed(chalk.green(`${db.type} Chaos: Database recovered successfully`))
    : spinner.fail(chalk.red(`${db.type} Chaos: Database did not recover`));

  return {
    name:   `${db.type.charAt(0).toUpperCase() + db.type.slice(1)} Chaos`,
    status: recovered ? 'PASS' : 'FAIL',
    detail: recovered
      ? `${db.type} restarted and passed: ${db.check_command}`
      : `${db.type} did not respond to: ${db.check_command}`
  };
}

module.exports = async function run(config) {
  console.log(chalk.cyan('  Target  :'), `${config.url}:${config.port}`);
  console.log(chalk.cyan('  Stack   :'), config.app?.start_command || 'not set');
  console.log(chalk.cyan('  Database:'), config.database?.enabled ? config.database.type : 'disabled');
  console.log();

  const results = [];

  const flood    = await floodTest(config);
  const inputs   = await badInputsTest(config);
  const crash    = await crashRecoveryTest(config);
  const database = await databaseChaosTest(config);

  [flood, inputs, crash, database].forEach(r => { if (r) results.push(r); });

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n' + chalk.bold('  ─────────────────────────────────────'));
  results.forEach(r => {
    const icon = r.status === 'PASS' ? chalk.green('✅') : chalk.red('❌');
    console.log(`  ${icon} ${chalk.bold(r.name)}`);
    console.log(`     ${chalk.gray(r.detail)}`);
  });
  console.log(chalk.bold('  ─────────────────────────────────────'));
  console.log(`\n  ${chalk.green(passed + ' passed')}  ${chalk.red(failed + ' failed')}\n`);

  const output = {
    timestamp: new Date().toLocaleString(),
    stack:     config.app?.start_command || 'unknown',
    database:  config.database?.type     || 'none',
    passed,
    failed,
    total:  results.length,
    status: failed === 0 ? 'HEALTHY' : 'ISSUES_FOUND',
    tests:  results
  };

  const resultsDir = path.join(process.cwd(), 'chaos-results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir);
  fs.writeFileSync(
    path.join(resultsDir, 'latest.json'),
    JSON.stringify(output, null, 2)
  );

  if (config.dashboard !== false) {
    console.log(chalk.cyan('  Launching dashboard at http://localhost:8080\n'));
    require('../dashboard/server')(output, config);
  }
};
