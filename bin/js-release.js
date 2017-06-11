#!/usr/bin/env node

const changelog = require('../src/changelog');
const release = require('../src/release');

const args = [].slice.call(process.argv, 2);
const cmd = args[0];
const dryRun = args.indexOf('-d') !== -1 || args.indexOf('--dry-run') !== -1;
const mode = cmd === 'create' ? args[1] : null;
const exit = (err) => {
  if (err) console.error(err.message);
  process.exit(1);
};

function cli() {
  if (cmd === 'create') return release({ mode, dryRun }, exit);
  if (cmd === 'changelog') return changelog({ mode }, exit);
  if (cmd !== 'help') console.error(new Error('Unknown command'));

  console.log(`
  Usage: js-release <command>

  Command:
  * js-release help                           display help (current view)
  * js-release changelog                      display changelog, merge commits since last release
  * js-release create (patch|minor|major)     create a new (patch|minor|major) release

  Options:
  * -d  --dry-run
  `);

  return exit();
}

cli();
