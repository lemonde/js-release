#! /usr/bin/env node

const fs = require('fs');
const path = require('path');

const { changelog, release, init } = require('../index');

const args = [].slice.call(process.argv, 2);
const cmd = args[0];
const dryRun = args.indexOf('-d') !== -1 || args.indexOf('--dry-run') !== -1;
const ignoreStaged = args.indexOf('-i') !== -1 || args.indexOf('--ignore-not-staged') !== -1;
const mode = cmd === 'create' ? args[1] : null;

const exit = (err) => {
  if (err) console.error(err.message);
  process.exit(1);
};

const version = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json')).toString()).version;

function cli() {
  if (cmd === 'init') return init({ mode, dryRun, ignoreStaged }, exit);
  if (cmd === 'create') return release({ mode, dryRun, ignoreStaged }, exit);
  if (cmd === 'changelog') return changelog({ mode }, exit);
  if (cmd !== 'help') console.error(new Error('Unknown command'));

  console.log(`
  Usage: js-release <command>
  Version: ${version}

  Command:
  * js-release help                           display help (current view)
  * js-release changelog                      display changelog, merge commits since last release
  * js-release create <patch|minor|major>     create a new (patch|minor|major) release
  * js-release init                           create the first release extracted from the package.json version

  Options:
  * -d  --dry-run
  * -i  --ignore-not-staged
  `);

  return exit();
}

cli();
