import chalk from 'chalk';
import { checkCommand } from './check.js';
import { conflictsCommand } from './conflicts.js';
import { diffSummaryCommand } from './diff-summary.js';

interface ReportOptions {
  upstream: string;
  fork: string;
}

export async function reportCommand(options: ReportOptions) {
  console.log(chalk.bold.blue('\n' + '═'.repeat(60)));
  console.log(chalk.bold.blue('  UPSTREAM PREFLIGHT REPORT'));
  console.log(chalk.bold.blue('═'.repeat(60)));
  console.log(chalk.dim(`  Generated: ${new Date().toISOString()}`));
  console.log(chalk.dim(`  Upstream: ${options.upstream} → Fork: ${options.fork}`));
  console.log(chalk.bold.blue('═'.repeat(60)));

  // Run all checks
  await diffSummaryCommand({ upstream: options.upstream });
  await conflictsCommand({ upstream: options.upstream, marker: '// FORK:' });
  await checkCommand(options);

  console.log(chalk.bold.blue('═'.repeat(60)));
  console.log(chalk.bold.blue('  END OF REPORT'));
  console.log(chalk.bold.blue('═'.repeat(60) + '\n'));
}
