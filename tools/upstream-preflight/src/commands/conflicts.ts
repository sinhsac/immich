import chalk from 'chalk';
import ora from 'ora';
import { branchExists, getCurrentBranch, getFilesWithMarker, getModifiedFiles } from '../utils/git.js';

interface ConflictsOptions {
  upstream: string;
  marker: string;
}

export async function conflictsCommand(options: ConflictsOptions) {
  console.log(chalk.bold('\n🔀 Fork Conflict Analysis\n'));

  const spinner = ora('Analyzing...').start();

  if (!branchExists(options.upstream)) {
    spinner.fail(`Upstream branch '${options.upstream}' not found`);
    return;
  }

  // Find files modified in fork
  spinner.text = 'Finding fork-modified files...';
  const forkFiles = getFilesWithMarker(options.marker);

  // Find files modified in upstream since divergence
  spinner.text = 'Finding upstream-modified files...';
  const currentBranch = getCurrentBranch();
  const upstreamModified = getModifiedFiles(currentBranch, options.upstream);

  // Find intersection (potential conflicts)
  const forkFileSet = new Set(forkFiles);
  const potentialConflicts = upstreamModified.filter((file) => forkFileSet.has(file));

  spinner.stop();

  console.log(chalk.dim(`Fork-modified files (with ${options.marker}): ${forkFiles.length}`));
  console.log(chalk.dim(`Upstream-modified files: ${upstreamModified.length}`));
  console.log('');

  if (potentialConflicts.length === 0) {
    console.log(chalk.green('✅ No potential conflicts detected!'));
    console.log(chalk.dim('Fork modifications do not overlap with upstream changes.'));
  } else {
    console.log(chalk.yellow.bold(`⚠️  ${potentialConflicts.length} potential conflict(s):`));
    console.log('');
    for (const file of potentialConflicts) {
      console.log(chalk.yellow(`  ⚡ ${file}`));
    }
    console.log('');
    console.log(chalk.dim('These files were modified in both fork and upstream.'));
    console.log(chalk.dim('Review them carefully during merge.'));
  }

  // Also list fork-only modifications
  if (forkFiles.length > 0) {
    console.log('');
    console.log(chalk.cyan.bold('📝 All fork-modified files:'));
    for (const file of forkFiles) {
      const isConflict = potentialConflicts.includes(file);
      const icon = isConflict ? chalk.yellow('⚡') : chalk.green('✓');
      console.log(`  ${icon} ${file}`);
    }
  }

  console.log('');
}
