const read = require('read');
const semver = require('semver');
const async = require('async');

const services = require('./services');

module.exports = ({ mode = 'patch', dryRun = false, ignoreStaged = false, firstRelease = false }, callback) => {
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

    if (!semver.valid(currentVersion)) return callback(new Error(`Current version is not a semver version : ${currentVersion}`));

    Object.assign(registry, { currentVersion });

    return callback(null, registry);
  });
}

function confirmCreation(registry, callback) {
  read({ prompt: `Create release ${registry.currentVersion} ?`, default: 'Y' }, (err, input) => {
    if (err) return callback(err);
    if (input === 'Y') return callback(null, registry);
    return callback(new Error('User interruption'));
  });
}

function bumpVersion(registry, callback) {
  services.bumpVersion({
    currentVersion: registry.currentVersion,
    dryRun: registry.dryRun,
  }, err => callback(err, registry));
}

function displayNewReleaseUrl(registry, callback) {
  services.releaseLink(registry.currentVersion, (err, link) => {
    if (err) return callback(err);
    console.log(link);
    return callback(null, registry);
  });
}
