const exec = require('child_process').exec;
const read = require('read');
const semver = require('semver');
const path = require('path');

const clean = str => str.replace(/\n/mg, '');

module.exports.version = (callback) => {
  exec('git describe --abbrev=0 --tags', (err, stdout, stderr) => {
    if (/no names found/mig.test(stderr)) return askVersion(callback);
    if (err) return callback(err);

    const currentVersion = clean(stdout);

    if (!semver.valid(currentVersion)) return callback(new Error(`Current version is not a semver version : ${currentVersion}`));

    return callback(null, currentVersion);
  });
};

function askVersion(callback) {
  read({ prompt: 'Actual version ?', default: 'v0.1.0' }, (err, input) => {
    if (err) return callback(err);
    if (semver.valid(input)) return callback(null, input);
    return callback(new Error('Invalid semver format'));
  });
}

module.exports.checkIfMaster = (callback) => {
  console.log('... Checking if repo is master');
  return callback(null, true);

  exec('git rev-parse --abbrev-ref HEAD', (err, stdout) => {
    if (err) return callback(err);
    return callback(null, clean(stdout) === 'master');
  });
};

module.exports.noPendingModifications = (callback) => {
  console.log('... Checking if repo has pending modifications');
  return callback(null, true);

  return exec('git status --untracked-files=no --porcelain', (err, stdout) => {
    if (err) return callback(err);
    return callback(null, clean(stdout) === '');
  });
};

module.exports.pullMaster = (callback) => {
  console.log('... Pulling changes from master');

  exec('git pull origin master', callback);
};

module.exports.fetchTags = (callback) => {
  console.log('... Fetching remote tags');

  exec('git fetch --tags', callback);
};

module.exports.bumpVersion = ({ version, dryRun = false }, callback) => {
  console.log('... Create version using mVersion');

  // -m means auto commit + version message
  const autoCommit = !semver.valid(version);
  const cmd = [
    path.join(__dirname, '..', 'node_modules/.bin/mversion'),
    version,
    autoCommit ? '-m' : '',
  ].join(' ');

  if (dryRun) {
    console.log(`[Dry run] ${cmd}`);
    return callback();
  }

  return exec(cmd, callback);
};

module.exports.pushVersion = (dryRun, callback) => {
  console.log('... Pushing version creation and version tag');

  const cmd = [
    'git push origin master --no-verify',
    'git push origin master --tags --no-verify',
  ].join(' && ');

  if (dryRun) {
    console.log(`[Dry run] ${cmd}`);
    return callback();
  }

  return exec(cmd, callback);
};

module.exports.releaseLink = (version, callback) => {
  exec('git remote show origin', (err, stdout) => {
    if (err) return callback(err);

    const fetchUrl = stdout.split('\n').find(line => /Fetch URL: (.*)\.git/mig.test(line));
    const githubRemoteUrl = fetchUrl.match(/Fetch URL: (.*)\.git/)[1];

    // (stdout.match(/Fetch URL: (.*)\.git/mig) || [])[1];
    return callback(null, `New release github edit link: ${githubRemoteUrl}/releases/new?tag=${version}`);
  });
};
