import { execSync } from 'node:child_process';

export interface GitResult {
  stdout: string;
  success: boolean;
  error?: string;
}

export function git(args: string, options?: { cwd?: string }): GitResult {
  try {
    const stdout = execSync(`git ${args}`, {
      encoding: 'utf-8',
      cwd: options?.cwd ?? process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { stdout, success: true };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString().trim() ?? '',
      success: false,
      error: error.stderr?.toString().trim() ?? error.message,
    };
  }
}

export function getCurrentBranch(): string {
  const result = git('rev-parse --abbrev-ref HEAD');
  return result.stdout;
}

export function branchExists(branch: string): boolean {
  const result = git(`rev-parse --verify ${branch}`);
  return result.success;
}

export function hasUncommittedChanges(): boolean {
  const result = git('status --porcelain');
  return result.stdout.length > 0;
}

export function getModifiedFiles(baseBranch: string, headBranch: string): string[] {
  const result = git(`diff --name-only ${baseBranch}...${headBranch}`);
  if (!result.success) return [];
  return result.stdout.split('\n').filter(Boolean);
}

export function getMergeBase(branch1: string, branch2: string): string {
  const result = git(`merge-base ${branch1} ${branch2}`);
  return result.stdout;
}

export function getCommitCount(from: string, to: string): number {
  const result = git(`rev-list --count ${from}..${to}`);
  return Number.parseInt(result.stdout, 10) || 0;
}

export function getFilesWithMarker(marker: string): string[] {
  const result = git(`grep -rl "${marker}" -- "*.ts" "*.svelte" "*.js"`);
  if (!result.success) return [];
  return result.stdout.split('\n').filter(Boolean);
}

export function simulateMerge(upstream: string): { conflicts: string[]; success: boolean } {
  // Try merge with --no-commit --no-ff
  const result = git(`merge --no-commit --no-ff ${upstream}`);

  if (result.success) {
    // Abort the merge since it's just a simulation
    git('merge --abort');
    return { conflicts: [], success: true };
  }

  // Get conflicted files
  const statusResult = git('diff --name-only --diff-filter=U');
  const conflicts = statusResult.stdout.split('\n').filter(Boolean);

  // Abort the merge
  git('merge --abort');

  return { conflicts, success: false };
}
