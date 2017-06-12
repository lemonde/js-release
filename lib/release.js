const read = require('read');
const semver = require('semver');
const async = require('async');

const services = require('./services');
const changelog = require('./changelog');

module.exports = ({ mode = 'patch', dryRun = false, ignoreStaged = false }, callback) => {
  if (dryRun) console.log('Dry run mode');
  if (ignoreStaged) console.log('Changes not staged will be ignored');

  async.waterfall([
    next => checkIfMaster({ mode, dryRun, ignoreStaged }, next),
    (registry, next) => noPendingModifications(registry, next),
    (registry, next) => services.pullMaster(err => next(err, registry)),
    (registry, next) => services.fetchTags(err => next(err, registry)),
    (registry, next) => getCurrentVersion(registry, next),
    (registry, next) => confirmCreation(registry, next),
    (registry, next) => bumpVersion(registry, next),
    (registry, next) => services.pushVersion(registry.dryRun, err => next(err, registry)),
    (registry, next) => displayNewReleaseUrl(registry, next),
  ], callback);
};

function checkIfMaster(registry, callback) {
  services.checkIfMaster((err, isMaster) => {
    if (err) return callback(err);
    if (!isMaster) return callback(new Error('You must be on the master branch to create a release'));
    return callback(null, registry);
  });
}

function noPendingModifications(registry, callback) {
  if (registry.ignoreStaged) return callback(null, registry);

  return services.noPendingModifications((err, hasNotPending) => {
    if (err) return callback(err);
    if (!hasNotPending) return callback(new Error('You have changes waiting on master, clean your state'));
    return callback(null, registry);
  });
}

function getCurrentVersion(registry, callback) {
  services.version((err, currentVersion) => {
    if (err) return callback(err);

    const nextVersion = semver.inc(currentVersion, registry.mode);

    if (!semver.valid(currentVersion)) return callback(new Error(`Current version is not a semver version : ${currentVersion}`));
    if (!semver.valid(nextVersion)) return callback(new Error(`Next version is not a semver version : ${nextVersion}`));

    Object.assign(registry, { currentVersion, nextVersion });

    return callback(null, registry);
  });
}

function confirmCreation(registry, callback) {
  async.series([
    next => changelog(registry, next),
    (next) => {
      console.log(`Bump version from ${registry.currentVersion} to v${registry.nextVersion}`);
      read({ prompt: `Create release v${registry.nextVersion} ?`, default: 'Y' }, (err, input) => {
        if (err) return next(err);
        if (input === 'Y') return next();
        return next(new Error('User interruption'));
      });
    },
  ], err => callback(err, registry));
}

function bumpVersion(registry, callback) {
  services.bumpVersion({
    mode: registry.mode,
    currentVersion: registry.currentVersion,
    nextVersion: `v${registry.nextVersion}`,
    dryRun: registry.dryRun,
  }, err => callback(err, registry));
}

function displayNewReleaseUrl(registry, callback) {
  services.releaseLink(`v${registry.nextVersion}`, (err, link) => {
    if (err) return callback(err);
    console.log(link);
    return callback(null, registry);
  });
}
