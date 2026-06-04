#!/usr/bin/env node
/**
 * Upstream Preflight Tool
 * CLI to manage rebase/merge from upstream Immich into this fork.
 */
import { Command } from 'commander';
import { checkCommand } from './commands/check.js';
import { conflictsCommand } from './commands/conflicts.js';
import { diffSummaryCommand } from './commands/diff-summary.js';
import { mergeCommand } from './commands/merge.js';
import { reportCommand } from './commands/report.js';

const program = new Command();

program
  .name('upstream-preflight')
  .description('CLI tool to manage rebase/merge from upstream Immich')
  .version('1.0.0');

program
  .command('check')
  .description('Run full preflight check before merging upstream')
  .option('--upstream <branch>', 'Upstream branch name', 'immich')
  .option('--fork <branch>', 'Fork branch name', 'main')
  .action(checkCommand);

program
  .command('merge')
  .description('Perform merge from upstream')
  .option('--dry-run', 'Simulate merge without committing', false)
  .option('--upstream <branch>', 'Upstream branch name', 'immich')
  .action(mergeCommand);

program
  .command('conflicts')
  .description('List fork-modified files that may conflict with upstream')
  .option('--upstream <branch>', 'Upstream branch name', 'immich')
  .option('--marker <marker>', 'Fork modification marker', '// FORK:')
  .action(conflictsCommand);

program
  .command('diff-summary')
  .description('Show diff summary between fork and upstream')
  .option('--upstream <branch>', 'Upstream branch name', 'immich')
  .action(diffSummaryCommand);

program
  .command('report')
  .description('Generate full preflight report')
  .option('--upstream <branch>', 'Upstream branch name', 'immich')
  .option('--fork <branch>', 'Fork branch name', 'main')
  .action(reportCommand);

program.parse();
