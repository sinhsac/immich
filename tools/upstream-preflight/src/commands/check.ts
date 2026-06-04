import chalk from 'chalk';
import ora from 'ora';
import {
    branchExists,
    getCommitCount,
    getCurrentBranch,
    getFilesWithMarker,
    getMergeBase,
    hasUncommittedChanges,
    simulateMerge,
} from '../utils/git.js';

interface CheckOptions {
  upstream: string;
  fork: string;
}

export async function checkCommand(options: CheckOptions) {
  console.log(chalk.bold('\n🔍 Upstream Preflight Check\n'));

  const spinner = ora('Running checks...').start();
  const issues: string[] = [];
  const warnings: string[] = [];

  // 1. Check current branch
  const currentBranch = getCurrentBranch();
  spinner.text = `Current branch: ${currentBranch}`;

  if (currentBranch !== options.fork) {
    warnings.push(`Not on fork branch (${options.fork}). Currently on: ${currentBranch}`);
  }

  // 2. Check upstream branch exists
  spinner.text = 'Checking upstream branch...';
  if (!branchExists(options.upstream)) {
    issues.push(`Upstream branch '${options.upstream}' does not exist. Run: git fetch origin ${options.upstream}`);
    spinner.fail('Upstream branch not found');
    printResults(issues, warnings);
    return;
  }

  // 3. Check for uncommitted changes
  spinner.text = 'Checking for uncommitted changes...';
  if (hasUncommittedChanges()) {
    issues.push('Uncommitted changes detected. Please commit or stash before merging.');
  }

  // 4. Check commit distance
  spinner.text = 'Calculating commit distance...';
  const mergeBase = getMergeBase(options.upstream, currentBranch);
  const upstreamAhead = getCommitCount(mergeBase, options.upstream);
  const forkAhead = getCommitCount(mergeBase, currentBranch);

  console.log('');
  spinner.info(`Upstream is ${chalk.yellow(upstreamAhead)} commits ahead of merge base`);
  ora().info(`Fork is ${chalk.cyan(forkAhead)} commits ahead of merge base`);

  // 5. Check fork-modified files
  spinner.text = 'Finding fork-modified files...';
  const forkFiles = getFilesWithMarker('// FORK:');
  if (forkFiles.length > 0) {
    ora().info(`Found ${chalk.yellow(forkFiles.length)} files with FORK markers`);
    for (const file of forkFiles) {
      console.log(chalk.dim(`  • ${file}`));
    }
  } else {
    ora().info('No files with FORK markers found (clean fork)');
  }

  // 6. Simulate merge
  spinner.text = 'Simulating merge...';
  if (upstreamAhead > 0) {
    const { conflicts, success } = simulateMerge(options.upstream);
    if (success) {
      ora().succeed('Merge simulation: No conflicts detected ✓');
    } else {
      issues.push(`Merge would produce ${conflicts.length} conflict(s)`);
      ora().fail(`Merge simulation: ${conflicts.length} conflict(s) detected`);
      for (const file of conflicts) {
        console.log(chalk.red(`  ✗ ${file}`));
      }
    }
  } else {
    ora().succeed('Already up to date with upstream');
  }

  spinner.stop();
  printResults(issues, warnings);
}

function printResults(issues: string[], warnings: string[]) {
  console.log('');

  if (warnings.length > 0) {
    console.log(chalk.yellow.bold('⚠️  Warnings:'));
    for (const warning of warnings) {
      console.log(chalk.yellow(`  • ${warning}`));
    }
    console.log('');
  }

  if (issues.length > 0) {
    console.log(chalk.red.bold('❌ Issues found:'));
    for (const issue of issues) {
      console.log(chalk.red(`  • ${issue}`));
    }
    console.log('');
    console.log(chalk.red('Resolve issues before merging upstream.'));
  } else {
    console.log(chalk.green.bold('✅ All checks passed! Safe to merge upstream.'));
  }
  console.log('');
}
