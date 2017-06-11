const exec = require('child_process').exec;
const semver = require('semver');
const async = require('async');

const clean = str => str.replace(/\n/mg, '');

module.exports = ({ mode = 'patch', dryRun = false, packagePath = '', shrinkwrapPath = null }, callback) => {
  const registry = { mode, dryRun, packagePath, shrinkwrapPath };

  async.series([
    next => getCurrentVersion(registry, next),
    next => getMergesSince(registry, next),
  ], callback);
};

function getCurrentVersion(registry, callback) {
  exec('git describe --abbrev=0 --tags', (err, stdout) => {
    if (err) return callback(err);

    const currentVersion = clean(stdout);

    if (!semver.valid(currentVersion)) return callback(new Error(`Current version is not a semver version : ${currentVersion}`));

    Object.assign({ currentVersion });

    return callback();
  });
}

function getMergesSince(registry, callback) {
  exec(`git log --merges --pretty='* %b (%h)' ${registry.currentVersion}..HEAD`, (err, stdout) => {
    if (err) return callback(err);
    console.log(stdout);
    return callback();
  });
}
