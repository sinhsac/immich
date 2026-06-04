import chalk from 'chalk';
import ora from 'ora';
import { branchExists, git, hasUncommittedChanges, simulateMerge } from '../utils/git.js';

interface MergeOptions {
  dryRun: boolean;
  upstream: string;
}

export async function mergeCommand(options: MergeOptions) {
  console.log(chalk.bold(`\n🔀 ${options.dryRun ? 'Dry-run' : ''} Merge from upstream\n`));

  const spinner = ora('Preparing...').start();

  // Pre-checks
  if (!branchExists(options.upstream)) {
    spinner.fail(`Upstream branch '${options.upstream}' not found`);
    console.log(chalk.dim(`Run: git fetch origin ${options.upstream}`));
    return;
  }

  if (hasUncommittedChanges()) {
    spinner.fail('Uncommitted changes detected');
    console.log(chalk.dim('Please commit or stash your changes first.'));
    return;
  }

  if (options.dryRun) {
    spinner.text = 'Simulating merge (dry-run)...';
    const { conflicts, success } = simulateMerge(options.upstream);

    spinner.stop();

    if (success) {
      console.log(chalk.green('✅ Dry-run merge successful! No conflicts.'));
      console.log(chalk.dim('Run without --dry-run to perform the actual merge.'));
    } else {
      console.log(chalk.red(`❌ Dry-run merge found ${conflicts.length} conflict(s):`));
      for (const file of conflicts) {
        console.log(chalk.red(`  ✗ ${file}`));
      }
      console.log('');
      console.log(chalk.dim('Resolve these conflicts before merging.'));
    }
  } else {
    spinner.text = `Merging ${options.upstream}...`;
    const result = git(`merge ${options.upstream} --no-edit`);

    spinner.stop();

    if (result.success) {
      console.log(chalk.green('✅ Merge successful!'));
      console.log(chalk.dim(result.stdout));
    } else {
      console.log(chalk.red('❌ Merge failed with conflicts:'));
      console.log(chalk.dim(result.error));
      console.log('');
      console.log(chalk.yellow('Resolve conflicts and run: git merge --continue'));
    }
  }

  console.log('');
}
