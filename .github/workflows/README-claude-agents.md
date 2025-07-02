# Claude Agent Workflows Guide

## Overview

This repository has two main workflows for processing issues with Claude agents:

1. **`claude-agent-simulator.yml`** - Basic workflow (strict format requirements)
2. **`claude-agent-enhanced.yml`** - Enhanced workflow with fallback logic (recommended)

## Key Differences

### claude-agent-simulator.yml
- **Strict format**: Requires exact pattern `Target Agent: XXX-###` in issue body
- **No fallback**: Fails if pattern not found
- **Simple**: Basic error handling

### claude-agent-enhanced.yml (Recommended)
- **Flexible**: Can infer agent from issue labels if not specified
- **Smart fallbacks**: 
  - `bug` or `development` labels → DEV-002
  - `infrastructure` or `deployment` labels → OPS-003
  - Default → QRA-001
- **Better error handling**: Includes retries and rate limit handling
- **Manual trigger**: Can be run via workflow_dispatch with issue number

## How to Use

### Option 1: Ensure Proper Issue Format
Include this in your issue body:
```
Target Agent: DEV-002
```

Available agents:
- **QRA-001** - Quality Review Agent
- **DEV-002** - Development Agent  
- **OPS-003** - Operations Agent

### Option 2: Use Enhanced Workflow
The enhanced workflow will automatically:
1. Try to find the Target Agent specification
2. If not found, infer from issue labels
3. Default to QRA-001 if no hints available

### Option 3: Manual Trigger
1. Go to Actions → Claude Agent Enhanced
2. Click "Run workflow"
3. Enter the issue number
4. The workflow will process that specific issue

## Recommendation

We recommend using `claude-agent-enhanced.yml` as it provides:
- Better error handling
- Automatic agent inference
- Rate limit protection
- Manual trigger capability
- More detailed logging

To switch to using the enhanced workflow by default, you can disable the simulator workflow or update your issue labels to trigger the enhanced version instead.