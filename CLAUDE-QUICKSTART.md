# Claude Agent System Quick Start Guide

## 🚀 Immediate Actions

### 1. Authenticate GitHub CLI
```bash
gh auth login
```
Follow the prompts to authenticate with your GitHub account.

### 2. Create the Pull Request
```bash
./create-pr.sh
```

### 3. After PR is Merged

#### Set up GitHub Secret
1. Go to https://github.com/lrpthomas/LRPDM/settings/secrets/actions
2. Click "New repository secret"
3. Name: `CLAUDE_API_KEY`
4. Value: Your Claude API key from Anthropic

#### Create Your First Agent Task
1. Go to https://github.com/lrpthomas/LRPDM/issues/new/choose
2. Select "Claude Agent Task"
3. Fill in the details (use sample-claude-issue.md as reference)
4. Add the `claude-agent` label
5. Submit the issue

## 📋 Available Agents

### QRA-001 (Quality Review)
- Automated code quality analysis
- Test coverage verification
- Security vulnerability scanning
- Performance benchmarking

### DEV-002 (Development)
- Code generation
- Bug fixes
- Test creation
- Documentation updates

### OPS-003 (Operations)
- Deployment orchestration
- Infrastructure provisioning
- Monitoring setup
- Rollback management

## 🔄 Workflow

```
GitHub Issue → claude-agent label → Agent Task → Execution → Output (PR/Report)
```

## 🛠️ Troubleshooting

### If workflows don't trigger:
1. Check Actions are enabled: https://github.com/lrpthomas/LRPDM/settings/actions
2. Verify CLAUDE_API_KEY is set in secrets
3. Check workflow runs: https://github.com/lrpthomas/LRPDM/actions

### To monitor agent execution:
1. Go to Actions tab
2. Look for "Issue to Agent Converter" workflow
3. Click on the run to see logs

## 📚 Files Created

- `pr-description.md` - Pull request description
- `create-pr.sh` - Script to create the PR
- `sample-claude-issue.md` - Example agent task issue
- `CLAUDE-QUICKSTART.md` - This guide

Ready to activate the Claude agents! 🤖