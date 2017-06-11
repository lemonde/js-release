const read = require('read');
const semver = require('semver');
const exec = require('child_process').exec;
const fs = require('fs');
const async = require('async');
const path = require('path');

const changelog = require('./changelog');

const clean = str => str.replace(/\\n/mg, '');

module.exports = ({ mode = 'patch', dryRun = false }, callback) => {
  const registry = { mode, dryRun };

  if (dryRun) console.log('Dry run mode');

  async.series([
    next => checkIfMaster(registry, next),
    next => noPendingModifications(registry, next),
    next => pullMaster(next),
    next => fetchTags(next),
    next => getCurrentVersion(registry, next),
    next => confirmCreation(registry, next),
    next => bumpVersion(registry, next),
    next => pushVersion(registry, next),
    next => displayNewReleaseUrl(registry, next),
  ], callback);
};

function checkIfMaster(registry, callback) {
  console.log('... Checking if repo is master');

  exec('git rev-parse --abbrev-ref HEAD', (err, stdout) => {
    if (err) return callback(err);
    if (clean(stdout) !== 'master') return callback(new Error('You must be on the master branch to create a release'));
    return callback();
  });
}

function noPendingModifications(registry, callback) {
  console.log('... Checking if repo has pending modifications');

  exec('git status --untracked-files=no --porcelain', (err, stdout) => {
    if (err) return callback(err);
    if (clean(stdout) !== '') return callback(new Error('You have changes waiting on master, clean your state'));
    return callback();
  });
}

function pullMaster(callback) {
  console.log('... Pulling changes from master');

  exec('git pull origin master', callback);
}

function fetchTags(callback) {
  console.log('... Fetching remote tags');

  exec('git fetch --tags', callback);
}

function getCurrentVersion(registry, callback) {
  exec('git describe --abbrev=0 --tags', (err, stdout) => {
    if (err) return callback(err);

    const currentVersion = clean(stdout);
    const nextVersion = semver.inc(currentVersion, registry.mode);

    if (!semver.valid(currentVersion)) return callback(new Error(`Current version is not a semver version : ${currentVersion}`));
    if (!semver.valid(nextVersion)) return callback(new Error(`Next version is not a semver version : ${nextVersion}`));

    Object.assign({ currentVersion, nextVersion });

    return callback();
  });
}

function confirmCreation(registry, callback) {
  async.series([
    next => changelog(registry, next),
    (next) => {
      console.log(`Bump version from ${registry.currentVersion} to ${registry.nextVersion}`);
      read({ prompt: 'Press key to confirm, CTRL+C to abort' }, next);
    },
  ], callback);
}

function bumpVersion(registry, callback) {
  console.log('... Bumping version using mVersion');

  const cmd = `${path.join(__dirname, '..', 'node_modules/.bin/mversion')} ${registry.mode} -m`;

  if (registry.dryRun) {
    console.log(`[Dry run] ${cmd}`);
    callback();
  }

  // -m means auto commit + version message
  return exec(cmd, callback);
}

function pushVersion(registry, callback) {
  console.log('... Pushing version bump and version tag');

  const cmd = 'git push origin master --no-verify && git push origin master --tags --no-verify';

  if (registry.dryRun) {
    console.log(`[Dry run] ${cmd}`);
    callback();
  }

  exec(cmd, callback);
}

function displayNewReleaseUrl(registry, callback) {
  console.log(`New release github edit link: https://github.com/lemonde/cms/releases/new?tag=v${registry.nextVersion}`);
  process.nextTick(callback);
}
