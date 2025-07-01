#!/bin/bash
set -euo pipefail

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
CLAUDE_HOOKS_DIR="$(git rev-parse --show-toplevel)/.claude/hooks"

# Pre-commit hook with comprehensive validation pipeline
cat > "${CLAUDE_HOOKS_DIR}/pre-commit" << 'HOOK'
#!/bin/bash
set -euo pipefail

echo -e "\033[1;34m[CLAUDE PRE-COMMIT] Initiating validation sequence...\033[0m"

# Phase 1: Syntax validation
if ! claude validate syntax --strict --fail-fast; then
    echo -e "\033[0;31m✗ Syntax validation failed\033[0m"
    exit 1
fi

# Phase 2: Type safety enforcement
if ! pnpm type-check; then
    echo -e "\033[0;31m✗ TypeScript compilation failed\033[0m"
    exit 1
fi

# Phase 3: Test execution with coverage gate
if ! pnpm test:affected --coverage --threshold=85; then
    echo -e "\033[0;31m✗ Test coverage below threshold\033[0m"
    exit 1
fi

# Phase 4: Security vulnerability scan
if ! claude scan security --severity=MEDIUM; then
    echo -e "\033[0;31m✗ Security vulnerabilities detected\033[0m"
    exit 1
fi

echo -e "\033[0;32m✓ All validation gates passed\033[0m"
HOOK

# Pre-push hook with deployment safety checks
cat > "${CLAUDE_HOOKS_DIR}/pre-push" << 'HOOK'
#!/bin/bash
set -euo pipefail

protected_branches="^(main|production|release/.*)$"
current_branch=$(git rev-parse --abbrev-ref HEAD)

if [[ "$current_branch" =~ $protected_branches ]]; then
    echo -e "\033[1;33m[CLAUDE PRE-PUSH] Protected branch detected, executing enhanced validation...\033[0m"
    
    # Execute full agent validation suite
    claude agent execute QRA-001 --mode=comprehensive || exit 1
fi

# Verify no secrets in commits
if ! claude scan secrets --all-commits; then
    echo -e "\033[0;31m✗ Secrets detected in commit history\033[0m"
    exit 1
fi
HOOK

# Make hooks executable
chmod +x "${CLAUDE_HOOKS_DIR}"/{pre-commit,pre-push}

# Symlink to git hooks directory
ln -sf "${CLAUDE_HOOKS_DIR}/pre-commit" "${HOOKS_DIR}/pre-commit"
ln -sf "${CLAUDE_HOOKS_DIR}/pre-push" "${HOOKS_DIR}/pre-push"

echo -e "\033[0;32m✓ Claude git hooks installed successfully\033[0m"
