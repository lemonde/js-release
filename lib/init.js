const read = require('read');
const semver = require('semver');
const async = require('async');

const services = require('./services');

module.exports = ({
  mode = 'patch',
  dryRun = false,
  ignoreStaged = false,
  ignoreIsMaster = false,
  firstRelease = false,
}, callback) => {
  async.waterfall([
    next => checkIfMaster({ mode, dryRun, ignoreStaged, ignoreIsMaster }, next),
    (registry, next) => noPendingModifications(registry, next),
    (registry, next) => services.pullMaster(err => next(err, registry)),
    (registry, next) => services.fetchTags(err => next(err, registry)),
    (registry, next) => getCurrentVersion(registry, next),
    (registry, next) => confirmCreation(registry, next),
    (registry, next) => bumpVersion(registry, next),
    (registry, next) => services.pushVersion(registry.dryRun, err => next(err, registry)),
    (registry, next) => createRelease(registry, next),
  ], callback);
};

function checkIfMaster(registry, callback) {
  if (registry.ignoreIsMaster) return callback(null, registry);

  return services.checkIfMaster((err, isMaster) => {
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


function createRelease(registry, callback) {
  services.createRelease(
    registry.dryRun,
    registry.currentVersion,
    registry.changelog,
    (err, link) => {
      if (err) return callback(err);
      console.log(`New release : ${link}`);
      return callback(null, registry);
    }
  );
}
