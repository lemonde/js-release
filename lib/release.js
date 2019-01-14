const read = require('read');
const semver = require('semver');
const async = require('async');
const { exec } = require('child_process');

const services = require('./services');
const getChangelog = require('./changelog');

const maxBuffer = 1024 * 1024 * 10;

module.exports = (
  {
    dryRun = false,
    ignoreStaged = false,
    ignoreIsMaster = false,
    mode = 'patch',
    staticConfig = {},
  },
  callback
) => {
  async.waterfall(
    [
      next =>
        checkIfMaster(
          { mode, dryRun, ignoreStaged, ignoreIsMaster, staticConfig },
          next
        ),
      (registry, next) => noPendingModifications(registry, next),
      (registry, next) => services.pullMaster(err => next(err, registry)),
      (registry, next) => services.fetchTags(err => next(err, registry)),
      (registry, next) => getCurrentVersion(registry, next),
      (registry, next) => confirmCreation(registry, next),
      (registry, next) => preRelease(registry, next),
      (registry, next) => bumpVersion(registry, next),
      (registry, next) =>
        services.pushVersion(registry.dryRun, err => next(err, registry)),
      (registry, next) => createRelease(registry, next),
      (registry, next) => postRelease(registry, next),
    ],
    callback
  );
};

function checkIfMaster(registry, callback) {
  if (registry.ignoreIsMaster) return callback(null, registry);

  return services.checkIfMaster((err, isMaster) => {
    if (err) return callback(err);
    if (!isMaster)
      return callback(
        new Error('You must be on the master branch to create a release')
      );
    return callback(null, registry);
  });
}

function noPendingModifications(registry, callback) {
  if (registry.ignoreStaged) return callback(null, registry);

  return services.noPendingModifications((err, hasNotPending) => {
    if (err) return callback(err);
    if (!hasNotPending)
      return callback(
        new Error('You have changes waiting on master, clean your state')
      );
    return callback(null, registry);
  });
}

function getCurrentVersion(registry, callback) {
  services.version((err, currentVersion) => {
    if (err) return callback(err);

    const nextVersion = semver.inc(currentVersion, registry.mode);

    if (!semver.valid(currentVersion))
      return callback(
        new Error(`Current version is not a semver version : ${currentVersion}`)
      );
    if (!semver.valid(nextVersion))
      return callback(
        new Error(`Next version is not a semver version : ${nextVersion}`)
      );

    Object.assign(registry, { currentVersion, nextVersion });

    return callback(null, registry);
  });
}

function confirmCreation(registry, callback) {
  async.series(
    [
      next =>
        getChangelog(registry, (err, changelog) => {
          if (err) return next(err);
          console.log(changelog);
          Object.assign(registry, { changelog });
          return next();
        }),
      next => {
        console.log(
          `Bump version from ${registry.currentVersion} to v${
            registry.nextVersion
          }`
        );
        read(
          { prompt: `Create release v${registry.nextVersion} ?`, default: 'Y' },
          (err, input) => {
            if (err) return next(err);
            if (input === 'Y') return next();
            return next(new Error('User interruption'));
          }
        );
      },
    ],
    err => callback(err, registry)
  );
}

function preRelease(registry, callback) {
  if (!registry.staticConfig.preRelease) return callback(null, registry);

  if (registry.dryRun) {
    console.log(`[Dry run] ${registry.staticConfig.preRelease}`);
    return callback(null, registry);
  }

  return exec(
    registry.staticConfig.preRelease,
    {
      env: {
        ...process.env,
        PKG_VERSION: registry.nextVersion,
      },
      maxBuffer,
    },
    (err, stdout, stderr) => {
      if (stderr) console.log('stderr', stderr);
      callback(err, registry);
    }
  );
}

function bumpVersion(registry, callback) {
  services.bumpVersion(
    {
      mode: registry.mode,
      currentVersion: registry.currentVersion,
      nextVersion: `v${registry.nextVersion}`,
      dryRun: registry.dryRun,
    },
    err => callback(err, registry)
  );
}

function createRelease(registry, callback) {
  services.createRelease(
    registry.dryRun,
    `v${registry.nextVersion}`,
    registry.changelog,
    (err, link) => {
      if (err) return callback(err);
      console.log(`New release : ${link}`);
      return callback(null, registry);
    }
  );
}

function postRelease(registry, callback) {
  if (!registry.staticConfig.postRelease) return callback(null, registry);

  if (registry.dryRun) {
    console.log(`[Dry run] ${registry.staticConfig.postRelease}`);
    return callback(null, registry);
  }

  return exec(
    registry.staticConfig.postRelease,
    {
      env: {
        ...process.env,
        PKG_VERSION: registry.nextVersion,
      },
      maxBuffer,
    },
    (err, stdout, stderr) => {
      if (stderr) console.log('stderr', stderr);
      callback(err, registry);
    }
  );
}
