import chalk from 'chalk';
import ora from 'ora';
import { branchExists, getCurrentBranch, git } from '../utils/git.js';

interface DiffSummaryOptions {
  upstream: string;
}

export async function diffSummaryCommand(options: DiffSummaryOptions) {
  console.log(chalk.bold('\n📊 Diff Summary: Fork vs Upstream\n'));

  const spinner = ora('Calculating...').start();

  if (!branchExists(options.upstream)) {
    spinner.fail(`Upstream branch '${options.upstream}' not found`);
    return;
  }

  const currentBranch = getCurrentBranch();

  // Get stat summary
  spinner.text = 'Getting diff stats...';
  const statResult = git(`diff --stat ${options.upstream}...${currentBranch}`);

  // Get file change summary
  spinner.text = 'Counting changes...';
  const numstatResult = git(`diff --numstat ${options.upstream}...${currentBranch}`);

  spinner.stop();

  if (!numstatResult.stdout) {
    console.log(chalk.green('No differences between fork and upstream.'));
    return;
  }

  // Parse numstat
  const lines = numstatResult.stdout.split('\n').filter(Boolean);
  let totalAdded = 0;
  let totalRemoved = 0;
  const fileChanges: { file: string; added: number; removed: number }[] = [];

  for (const line of lines) {
    const [added, removed, file] = line.split('\t');
    const addedNum = Number.parseInt(added, 10) || 0;
    const removedNum = Number.parseInt(removed, 10) || 0;
    totalAdded += addedNum;
    totalRemoved += removedNum;
    fileChanges.push({ file, added: addedNum, removed: removedNum });
  }

  // Summary
  console.log(chalk.dim(`Comparing: ${currentBranch} ← ${options.upstream}`));
  console.log('');
  console.log(`  Files changed: ${chalk.yellow(fileChanges.length)}`);
  console.log(`  Lines added:   ${chalk.green(`+${totalAdded}`)}`);
  console.log(`  Lines removed: ${chalk.red(`-${totalRemoved}`)}`);
  console.log('');

  // Group by directory
  const byDir = new Map<string, typeof fileChanges>();
  for (const change of fileChanges) {
    const dir = change.file.split('/').slice(0, 2).join('/');
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push(change);
  }

  console.log(chalk.bold('Changes by directory:'));
  const sortedDirs = [...byDir.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [dir, changes] of sortedDirs.slice(0, 15)) {
    const dirAdded = changes.reduce((sum, c) => sum + c.added, 0);
    const dirRemoved = changes.reduce((sum, c) => sum + c.removed, 0);
    console.log(
      `  ${chalk.cyan(dir.padEnd(40))} ${chalk.yellow(String(changes.length).padStart(3))} files  ${chalk.green(`+${dirAdded}`)} ${chalk.red(`-${dirRemoved}`)}`,
    );
  }

  if (sortedDirs.length > 15) {
    console.log(chalk.dim(`  ... and ${sortedDirs.length - 15} more directories`));
  }

  console.log('');
}
