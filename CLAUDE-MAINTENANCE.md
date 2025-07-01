# Claude Agent System Maintenance Guide

## 🚨 Common Issues and Solutions

### 1. Agents Not Responding to Issues

**Symptoms**: Issues with `claude-agent` label have no bot comments after 1 hour

**Solutions**:
- Check GitHub Actions tab for workflow failures
- Verify `CLAUDE_API_KEY` is set in repository secrets
- Run the health check workflow manually
- Check API rate limits (429 errors in logs)

### 2. Workflow Failures

**Issue**: "claude: command not found" or similar errors

**Cause**: Original workflows tried to use non-existent Claude CLI

**Solution**: Use the enhanced workflows:
- `claude-agent-enhanced.yml` - Processes issues correctly
- `claude-agent-simulator.yml` - Backup processor
- Disable `claude-orchestration.yml` and `issue-to-agent.yml`

### 3. API Rate Limits

**Symptoms**: 429 errors, "Rate limit reached" messages

**Solutions**:
- Reduce frequency of scheduled workflows
- Add delays between API calls
- Implement request queuing
- Consider upgrading Anthropic API tier

## ✅ Best Practices

### Creating Claude Tasks

1. **Always include agent ID** in issue body:
   ```
   Target Agent: DEV-002 (Development)
   ```

2. **Use clear task specifications**:
   - What needs to be done
   - Expected outcome
   - Any constraints

3. **Label correctly**:
   - `claude-agent` - Required for processing
   - `high-priority` - For urgent tasks
   - `bug`, `feature`, `documentation` - For categorization

### Monitoring System Health

1. **Daily Checks**:
   - Review GitHub Actions for failures
   - Check for stuck issues
   - Monitor the health check workflow

2. **Weekly Maintenance**:
   - Clean up old closed issues
   - Review agent performance
   - Update prompts if needed

3. **Monthly Review**:
   - Analyze API usage and costs
   - Update agent capabilities
   - Refine workflows

## 🛠️ Troubleshooting Commands

### Manually Trigger Agent on Issue
```yaml
Go to Actions → Claude Agent Enhanced → Run workflow
Enter issue number → Run
```

### Check API Key
```bash
# In GitHub Actions logs, look for:
"✅ CLAUDE_API_KEY is configured"
# or
"❌ CLAUDE_API_KEY is not set"
```

### Find Stuck Issues
```
Go to Issues → Labels → claude-agent
Sort by: Least recently updated
Look for issues without bot comments
```

## 📊 Metrics to Track

1. **Response Time**: How long until agent responds
2. **Success Rate**: Completed vs failed tasks
3. **API Usage**: Tokens/requests per day
4. **Issue Resolution**: Time from creation to closure

## 🔧 Workflow Status

### ✅ Working Workflows
- `claude-agent-enhanced.yml` - Main agent processor
- `claude-agent-simulator.yml` - Backup processor  
- `claude-health-check.yml` - System monitoring
- `claude-test.yml` - Testing tool
- `claude-cleanup.yml` - Maintenance tool

### ❌ Disabled Workflows (use non-existent CLI)
- `claude-orchestration.yml`
- `issue-to-agent.yml`

### ⚠️ Scheduled Workflows
- `claude-auto-discovery.yml` - Every 6 hours
- `claude-daily-tasks.yml` - Daily at 9 AM UTC
- `claude-health-check.yml` - Every hour

## 🚀 Quick Fixes

### Agent Not Working?
1. Run `claude-test.yml` workflow
2. Check the created test issue
3. If no response, check API key

### Too Many Issues Created?
1. Disable scheduled workflows temporarily
2. Run cleanup workflow
3. Adjust schedule frequencies

### Need to Process Old Issue?
1. Go to Actions → Claude Agent Enhanced
2. Run workflow with issue number
3. Check issue for agent response

## 📞 Escalation

If issues persist:
1. Check Anthropic API status
2. Review GitHub Actions quotas
3. Verify repository permissions
4. Check webhook configurations