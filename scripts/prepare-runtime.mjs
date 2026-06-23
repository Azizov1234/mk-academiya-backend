import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function toSqliteFileUrl(filePath) {
  return `file:${filePath.replace(/\\/g, '/')}`;
}

function normalizeDatabaseUrl(url) {
  if (!url.startsWith('file:')) {
    return url;
  }

  const sqlitePath = url.slice('file:'.length);
  if (!sqlitePath.startsWith('./') && !sqlitePath.startsWith('.\\')) {
    return url;
  }

  return toSqliteFileUrl(resolve(process.cwd(), sqlitePath));
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) {
    return normalizeDatabaseUrl(process.env.DATABASE_URL.trim());
  }

  const isProductionRuntime =
    Boolean(process.env.RENDER) || process.env.NODE_ENV === 'production';

  if (isProductionRuntime) {
    throw new Error('DATABASE_URL is required in production/runtime environment');
  }

  return 'file:./prisma/dev.db';
}

function runCommand(command, args) {
  const isWindows = process.platform === 'win32';
  const result = isWindows
    ? spawnSync(
        process.env.ComSpec ?? 'cmd.exe',
        ['/d', '/s', '/c', [command, ...args].map(quoteForCmd).join(' ')],
        {
          stdio: 'inherit',
          env: process.env,
        },
      )
    : spawnSync(command, args, {
        stdio: 'inherit',
        env: process.env,
      });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function quoteForCmd(value) {
  const text = String(value);
  if (!/[ \t"]/g.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

const databaseUrl = resolveDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;
const prismaCommand = 'npx';
const isSqlite = databaseUrl.startsWith('file:');
const generatedClientPath = resolve(
  process.cwd(),
  'node_modules',
  '.prisma',
  'client',
  'index.js',
);
const shouldGenerateClient =
  process.env.FORCE_PRISMA_GENERATE === '1' || !existsSync(generatedClientPath);

console.log('============================================');
console.log('  MK Academy Backend - runtime prepare');
console.log('============================================');
console.log(`-> DATABASE_URL: ${databaseUrl}`);
console.log('');
if (shouldGenerateClient) {
  console.log('-> Generating Prisma client...');
  runCommand(prismaCommand, ['prisma', 'generate']);
} else {
  console.log('-> Prisma client already exists, skipping generate...');
}
console.log('');

if (isSqlite) {
  console.log('-> Syncing Prisma schema for SQLite...');
  runCommand(prismaCommand, ['prisma', 'db', 'push', '--skip-generate']);
} else {
  console.log('-> Running Prisma migrations...');
  runCommand(prismaCommand, ['prisma', 'migrate', 'deploy']);
}
