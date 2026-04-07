#!/usr/bin/env node
/**
 * 初始化 git 仓库（若尚未初始化），并确保根目录存在基础 .gitignore 条目。
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const gitDir = path.join(root, '.git');
const ignorePath = path.join(root, '.gitignore');

const requiredLines = [
  'node_modules',
  'dist',
  '.env',
  '.env.local',
  '*.local',
  '.DS_Store',
  'coverage',
];

function ensureGitInit() {
  if (fs.existsSync(gitDir)) {
    console.log('[init-repo] 已存在 .git，跳过 git init');
    return;
  }
  execSync('git init', { cwd: root, stdio: 'inherit' });
  console.log('[init-repo] 已执行 git init');
}

function mergeGitignore() {
  let existing = '';
  if (fs.existsSync(ignorePath)) {
    existing = fs.readFileSync(ignorePath, 'utf8');
  }
  const lines = existing.split(/\r?\n/).filter(Boolean);
  const set = new Set(lines);
  let added = 0;
  for (const line of requiredLines) {
    if (!set.has(line)) {
      lines.push(line);
      set.add(line);
      added++;
    }
  }
  if (added > 0 || !existing) {
    fs.writeFileSync(ignorePath, lines.join('\n') + '\n', 'utf8');
    console.log(`[init-repo] 已合并 .gitignore（新增 ${added} 条）`);
  } else {
    console.log('[init-repo] .gitignore 已包含必要条目');
  }
}

ensureGitInit();
mergeGitignore();
console.log('[init-repo] 完成');
