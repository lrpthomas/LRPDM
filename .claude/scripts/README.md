# Claude Agent Python Implementation

This directory contains the Python implementation that replaces the non-existent `claude` CLI tool.

## Overview

The workflows were attempting to use a `claude` CLI command that doesn't exist. This implementation provides a Python-based solution that:

1. Reads agent specifications from `.claude/agents/specs/`
2. Uses the Anthropic API to execute agent tasks
3. Supports the same command-line interface expected by the workflows

## Files

- `claude_agent.py` - Main implementation of the Claude agent executor
- `claude` - Wrapper script that mimics the CLI interface
- `test_agent.py` - Test script to verify the implementation
- `requirements.txt` - Python dependencies

## Usage

### In GitHub Actions

The workflows have been updated to use this implementation:

```yaml
- name: Setup Python
  uses: actions/setup-python@v4
  with:
    python-version: '3.11'
    
- name: Install dependencies
  run: |
    pip install -r .claude/requirements.txt
    
- name: Execute Claude Agent
  env:
    CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
  run: |
    python .claude/scripts/claude agent execute "QRA-001" \
      --context=.claude/contexts/ci.yaml \
      --output=.claude/logs/output.json \
      --metrics=.claude/logs/metrics.json
```

### Local Testing

1. Set your API key:
   ```bash
   export CLAUDE_API_KEY=your-api-key
   ```

2. Install dependencies:
   ```bash
   pip install -r .claude/requirements.txt
   ```

3. Run the test script:
   ```bash
   python .claude/scripts/test_agent.py
   ```

4. Execute an agent:
   ```bash
   python .claude/scripts/claude agent execute QRA-001
   ```

## Command Line Interface

The implementation supports the following command:

```
claude agent execute <agent_id> [options]

Options:
  --context PATH   Path to context YAML file
  --task PATH      Path to task YAML file  
  --output PATH    Path to save output JSON
  --metrics PATH   Path to save metrics JSON
```

## Agent IDs

Available agents (defined in `.claude/agents/specs/`):
- `QRA-001` - Quality Review Agent
- `DEV-002` - Development Agent
- `OPS-003` - Operations Agent

## Output Format

The agent execution produces a JSON output with the following structure:

```json
{
  "agent_id": "QRA-001",
  "timestamp": "2024-01-01T12:00:00",
  "duration_seconds": 5.2,
  "success": true,
  "error": null,
  "response": "Agent response text...",
  "metadata": {
    "agent_spec": {...},
    "context_file": "path/to/context.yaml",
    "task_file": "path/to/task.yaml"
  }
}
```

## Troubleshooting

1. **"CLAUDE_API_KEY environment variable not set"**
   - Ensure the API key is set in your environment or GitHub secrets

2. **"No specification found for agent"**
   - Check that the agent ID matches a file in `.claude/agents/specs/`
   - Agent IDs are case-insensitive

3. **API errors**
   - Verify your API key is valid
   - Check rate limits
   - Ensure you have internet connectivity