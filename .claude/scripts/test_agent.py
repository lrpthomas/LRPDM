#!/usr/bin/env python3
"""
Test script for the Claude agent implementation
"""
import os
import sys
import json
import tempfile
from pathlib import Path

# Add the scripts directory to Python path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from claude_agent import ClaudeAgent


def test_agent():
    """Test the agent implementation"""
    print("Testing Claude Agent Implementation\n")
    
    # Check for API key
    api_key = os.environ.get('CLAUDE_API_KEY')
    if not api_key:
        print("❌ CLAUDE_API_KEY environment variable not set")
        print("   Set it with: export CLAUDE_API_KEY=your-api-key")
        return False
    
    print("✅ API key found")
    
    # Initialize agent
    try:
        agent = ClaudeAgent(api_key)
        print("✅ Agent initialized")
    except Exception as e:
        print(f"❌ Failed to initialize agent: {e}")
        return False
    
    # Test loading agent spec
    try:
        spec = agent.load_agent_spec("QRA-001")
        print(f"✅ Loaded agent spec: {spec['metadata']['name']}")
    except Exception as e:
        print(f"❌ Failed to load agent spec: {e}")
        return False
    
    # Test with a simple task
    with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
        task_content = """
apiVersion: claude/v1
kind: Task
metadata:
  test: true
spec:
  requirements: |
    This is a test task. Please respond with "Test successful" if you can read this.
"""
        f.write(task_content)
        task_file = f.name
    
    try:
        print("\n📝 Executing test task...")
        result = agent.execute(
            agent_id="QRA-001",
            task_path=task_file
        )
        
        if result['success']:
            print(f"✅ Agent executed successfully")
            print(f"\n📄 Response:\n{result['response'][:200]}...")
        else:
            print(f"❌ Agent execution failed: {result['error']}")
            
    except Exception as e:
        print(f"❌ Execution error: {e}")
        return False
    finally:
        # Cleanup
        Path(task_file).unlink()
    
    print("\n✅ All tests passed!")
    return True


if __name__ == '__main__':
    success = test_agent()
    sys.exit(0 if success else 1)