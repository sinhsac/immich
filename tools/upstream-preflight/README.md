# Upstream Preflight Tool

CLI tool to manage rebase/merge from upstream Immich into this fork.

## Usage

```bash
# Check if merge from upstream is safe
pnpm --filter @immich-fork/upstream-preflight dev check

# Dry-run merge to see potential conflicts
pnpm --filter @immich-fork/upstream-preflight dev merge --dry-run

# List files modified in fork that may conflict
pnpm --filter @immich-fork/upstream-preflight dev conflicts

# Show diff summary between fork and upstream
pnpm --filter @immich-fork/upstream-preflight dev diff-summary

# Full preflight report
pnpm --filter @immich-fork/upstream-preflight dev report
```

## Commands

### `check`
Runs a full preflight check:
- Verifies upstream branch exists and is up to date
- Checks for uncommitted changes
- Identifies fork-modified files (files with `// FORK:` comments)
- Simulates merge and reports conflicts

### `merge --dry-run`
Performs a dry-run merge from the upstream branch (`immich`) into the current branch without actually committing.

### `conflicts`
Lists all files that have been modified in the fork (contain `// FORK:` markers) and checks which ones would conflict with upstream changes.

### `diff-summary`
Shows a summary of differences between the fork and upstream.

### `report`
Generates a full preflight report combining all checks.

## Configuration

The tool uses these defaults:
- Upstream branch: `immich`
- Fork branch: `main`
- Fork marker: `// FORK:`

Override via environment variables:
```bash
UPSTREAM_BRANCH=immich
FORK_BRANCH=main
FORK_MARKER="// FORK:"
```
