import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('============================================');
console.log('  MK Academy Backend - sync main');
console.log('============================================');
console.log('-> Fetching latest origin/main...');
run('git', ['fetch', 'origin', 'main']);
console.log('');
console.log('-> Checking out main...');
run('git', ['checkout', 'main']);
console.log('');
console.log('-> Resetting working tree to origin/main...');
run('git', ['reset', '--hard', 'origin/main']);
console.log('');
console.log('-> Cleaning untracked files...');
run('git', ['clean', '-fd']);
