#!/usr/bin/env python3
"""
Claude Agent Executor - Replacement for non-existent claude CLI
Executes agent tasks using the Anthropic API
"""
import os
import sys
import json
import yaml
import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
import anthropic
from anthropic import Anthropic

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('claude_agent')


class ClaudeAgent:
    """Executes Claude agent tasks using the Anthropic API"""
    
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
        self.base_path = Path(__file__).parent.parent
        
    def load_agent_spec(self, agent_id: str) -> Dict[str, Any]:
        """Load agent specification from YAML file"""
        spec_files = list(self.base_path.glob(f"agents/specs/{agent_id.lower()}*.yaml"))
        if not spec_files:
            raise FileNotFoundError(f"No specification found for agent {agent_id}")
        
        with open(spec_files[0], 'r') as f:
            return yaml.safe_load(f)
    
    def load_context(self, context_path: str) -> Dict[str, Any]:
        """Load context configuration"""
        if not context_path:
            return {}
            
        full_path = self.base_path / context_path
        if not full_path.exists():
            logger.warning(f"Context file not found: {context_path}")
            return {}
            
        with open(full_path, 'r') as f:
            return yaml.safe_load(f)
    
    def load_task(self, task_path: str) -> Dict[str, Any]:
        """Load task configuration"""
        if not task_path:
            return {}
            
        full_path = Path(task_path) if task_path.startswith('/') else self.base_path / task_path
        if not full_path.exists():
            logger.warning(f"Task file not found: {task_path}")
            return {}
            
        with open(full_path, 'r') as f:
            return yaml.safe_load(f)
    
    def build_prompt(self, agent_spec: Dict[str, Any], context: Dict[str, Any], 
                     task: Dict[str, Any]) -> str:
        """Build the prompt for Claude based on agent spec, context, and task"""
        agent_name = agent_spec['metadata']['name']
        agent_id = agent_spec['metadata']['id']
        
        prompt_parts = [
            f"You are {agent_name} (Agent ID: {agent_id}).",
            "",
            "## Agent Capabilities:",
        ]
        
        # Add capabilities
        if 'capabilities' in agent_spec['spec']:
            perms = agent_spec['spec']['capabilities'].get('permissions', [])
            prompt_parts.extend([f"- {perm}" for perm in perms])
        
        prompt_parts.extend(["", "## Agent Restrictions:"])
        if 'capabilities' in agent_spec['spec']:
            restrictions = agent_spec['spec']['capabilities'].get('restrictions', [])
            prompt_parts.extend([f"- {restriction}" for restriction in restrictions])
        
        # Add quality gates if present
        if 'quality_gates' in agent_spec['spec']:
            prompt_parts.extend(["", "## Quality Standards:"])
            gates = agent_spec['spec']['quality_gates']
            if 'thresholds' in gates:
                prompt_parts.append(f"- Test Coverage: {gates['thresholds'].get('test_coverage', {}).get('lines', 85)}%")
                prompt_parts.append(f"- Max Complexity: {gates['thresholds'].get('complexity', {}).get('cyclomatic', 10)}")
        
        # Add context
        if context:
            prompt_parts.extend(["", "## Context:", json.dumps(context, indent=2)])
        
        # Add task requirements
        if task:
            prompt_parts.extend(["", "## Task:"])
            if 'spec' in task and 'requirements' in task['spec']:
                prompt_parts.append(task['spec']['requirements'])
            else:
                prompt_parts.append(json.dumps(task, indent=2))
        
        prompt_parts.extend([
            "",
            "Please analyze and execute this task according to your capabilities and restrictions.",
            "Provide a detailed response including any issues found, recommendations, and actions taken."
        ])
        
        return "\n".join(prompt_parts)
    
    def execute(self, agent_id: str, context_path: Optional[str] = None,
                task_path: Optional[str] = None, output_path: Optional[str] = None,
                metrics_path: Optional[str] = None) -> Dict[str, Any]:
        """Execute the agent task"""
        logger.info(f"Executing agent {agent_id}")
        
        # Load configurations
        agent_spec = self.load_agent_spec(agent_id)
        context = self.load_context(context_path) if context_path else {}
        task = self.load_task(task_path) if task_path else {}
        
        # Build prompt
        prompt = self.build_prompt(agent_spec, context, task)
        
        # Execute with Claude
        start_time = datetime.now()
        try:
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0,
                system="You are a specialized agent in the GIS Platform development workflow. Analyze the provided context and execute the requested task according to your specifications.",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            response_text = message.content[0].text
            success = True
            error = None
            
        except Exception as e:
            logger.error(f"Error executing agent: {e}")
            response_text = f"Error: {str(e)}"
            success = False
            error = str(e)
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Prepare result
        result = {
            "agent_id": agent_id,
            "timestamp": start_time.isoformat(),
            "duration_seconds": duration,
            "success": success,
            "error": error,
            "response": response_text,
            "metadata": {
                "agent_spec": agent_spec['metadata'],
                "context_file": context_path,
                "task_file": task_path
            }
        }
        
        # Save output
        if output_path:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            logger.info(f"Results saved to {output_path}")
        
        # Save metrics
        if metrics_path:
            metrics = {
                "agent_id": agent_id,
                "timestamp": start_time.isoformat(),
                "duration_seconds": duration,
                "success": success,
                "tokens_used": len(prompt.split()) + len(response_text.split()),  # Rough estimate
            }
            metrics_file = Path(metrics_path)
            metrics_file.parent.mkdir(parents=True, exist_ok=True)
            with open(metrics_file, 'w') as f:
                json.dump(metrics, f, indent=2)
            logger.info(f"Metrics saved to {metrics_path}")
        
        return result


def main():
    """Main entry point for the Claude agent executor"""
    parser = argparse.ArgumentParser(description='Execute Claude agents')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Agent command
    agent_parser = subparsers.add_parser('agent', help='Agent operations')
    agent_subparsers = agent_parser.add_subparsers(dest='agent_command')
    
    # Execute command
    execute_parser = agent_subparsers.add_parser('execute', help='Execute an agent')
    execute_parser.add_argument('agent_id', help='Agent ID to execute (e.g., QRA-001)')
    execute_parser.add_argument('--context', help='Path to context YAML file')
    execute_parser.add_argument('--task', help='Path to task YAML file')
    execute_parser.add_argument('--output', help='Path to save output JSON')
    execute_parser.add_argument('--metrics', help='Path to save metrics JSON')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Get API key
    api_key = os.environ.get('CLAUDE_API_KEY')
    if not api_key:
        logger.error("CLAUDE_API_KEY environment variable not set")
        sys.exit(1)
    
    # Execute command
    if args.command == 'agent' and args.agent_command == 'execute':
        agent = ClaudeAgent(api_key)
        result = agent.execute(
            agent_id=args.agent_id,
            context_path=args.context,
            task_path=args.task,
            output_path=args.output,
            metrics_path=args.metrics
        )
        
        if result['success']:
            print(f"✅ Agent {args.agent_id} executed successfully")
            print(f"\nResponse:\n{result['response']}")
        else:
            print(f"❌ Agent {args.agent_id} execution failed: {result['error']}")
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()