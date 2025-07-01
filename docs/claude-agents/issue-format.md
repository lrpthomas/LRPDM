# Claude Agent Issue Format Guide

## Overview

The Claude Agent Enhanced workflow processes issues labeled with `claude-agent`. It's flexible and can work with different formats.

## Recommended Issue Format

```markdown
### Target Agent: DEV-002

### Task Description
[Your task description here]

### Requirements
- [ ] Requirement 1
- [ ] Requirement 2
```

## Supported Agent IDs

- **QRA-001**: Quality Review Agent (code quality, testing, security)
- **DEV-002**: Development Agent (bug fixes, features, tests)
- **OPS-003**: Operations Agent (deployment, infrastructure, monitoring)

## Agent Selection

The enhanced workflow will:

1. **Look for explicit agent ID** in the format: `Target Agent: [AGENT-ID]`
2. **Auto-detect from labels** if no explicit agent:
   - `development` or `bug` labels → DEV-002
   - `infrastructure` or `deployment` labels → OPS-003
   - Default → QRA-001
3. **Process the task** and post analysis as a comment

## Example Issues

### Example 1: Explicit Agent
```markdown
Title: Fix TypeScript compilation errors

Labels: claude-agent, bug

Body:
Target Agent: DEV-002

Fix all TypeScript errors in the build process.
```

### Example 2: Auto-detected Agent
```markdown
Title: Setup monitoring for API endpoints

Labels: claude-agent, infrastructure

Body:
We need to add Prometheus monitoring to all API endpoints.
(No explicit agent needed - will auto-select OPS-003)
```

## Workflow Features

- **Automatic retries** on API failures
- **Rate limit handling** with exponential backoff
- **Duplicate detection** to avoid reprocessing
- **Label management** based on analysis results
- **Manual triggering** via workflow_dispatch with issue number

## Troubleshooting

If the workflow doesn't trigger:
1. Ensure the issue has the `claude-agent` label
2. Check that the workflow file exists: `.github/workflows/claude-agent-enhanced.yml`
3. Verify the CLAUDE_API_KEY secret is set in repository settings

If you see "No agent specified":
- This error comes from the old simulator workflow
- The enhanced workflow has been enabled which handles missing agents gracefully