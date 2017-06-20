const exec = require('child_process').exec;
const semver = require('semver');
const async = require('async');

const services = require('./services');

module.exports = ({ mode = 'patch', currentVersion = null }, callback) => {
  async.waterfall([
    next => getCurrentVersion({ mode, currentVersion }, next),
    (registry, next) => getMergesSince(registry, next),
  ], callback);
};

function getCurrentVersion(registry, callback) {
  if (registry.currentVersion) return callback(null, registry);

  return services.version((err, currentVersion) => {
    if (err) return callback(err);

    if (!semver.valid(currentVersion)) return callback(new Error(`Current version is not a semver version : ${currentVersion}`));

    Object.assign(registry, { currentVersion });

    return callback(null, registry);
  });
}

function getMergesSince(registry, callback) {
  exec(`git log --merges --pretty='* %b (%h)' ${registry.currentVersion}..HEAD`, (err, changelog) => {
    if (err) return callback(err);
    return callback(null, `\nChangelog:\n${changelog}`);
  });
}
