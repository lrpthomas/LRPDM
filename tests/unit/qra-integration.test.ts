import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// Security and Performance Script Integration Tests
describe('QRA Security and Performance Integration', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  
  it('should have security scan script available', () => {
    const securityScriptPath = path.join(projectRoot, 'scripts', 'security-scan.sh');
    expect(fs.existsSync(securityScriptPath)).toBe(true);
    
    const stats = fs.statSync(securityScriptPath);
    expect(stats.isFile()).toBe(true);
    
    // Check if script is executable
    const mode = stats.mode;
    const isExecutable = (mode & parseInt('111', 8)) !== 0;
    expect(isExecutable).toBe(true);
  });

  it('should have performance benchmark script available', () => {
    const performanceScriptPath = path.join(projectRoot, 'scripts', 'performance-benchmark.sh');
    expect(fs.existsSync(performanceScriptPath)).toBe(true);
    
    const stats = fs.statSync(performanceScriptPath);
    expect(stats.isFile()).toBe(true);
    
    // Check if script is executable
    const mode = stats.mode;
    const isExecutable = (mode & parseInt('111', 8)) !== 0;
    expect(isExecutable).toBe(true);
  });

  it('should have updated control script with QRA functionality', () => {
    const controlScriptPath = path.join(projectRoot, 'scripts', 'agents', 'control.sh');
    expect(fs.existsSync(controlScriptPath)).toBe(true);
    
    const content = fs.readFileSync(controlScriptPath, 'utf8');
    expect(content).toContain('quality_agent');
    expect(content).toContain('qra');
    expect(content).toContain('QRA-001');
    expect(content).toContain('node scripts/qra-agent.js');
  });

  it('should have QRA agent script available', () => {
    const qraScriptPath = path.join(projectRoot, 'scripts', 'qra-agent.js');
    expect(fs.existsSync(qraScriptPath)).toBe(true);
    
    const stats = fs.statSync(qraScriptPath);
    expect(stats.isFile()).toBe(true);
    
    // Check if script is executable
    const mode = stats.mode;
    const isExecutable = (mode & parseInt('111', 8)) !== 0;
    expect(isExecutable).toBe(true);
  });

  it('should have updated package.json with QRA scripts', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(packageJson.scripts).toHaveProperty('qra:start');
    expect(packageJson.scripts).toHaveProperty('qra:run');
    expect(packageJson.scripts['qra:start']).toBe('node scripts/qra-agent.js');
    expect(packageJson.scripts['qra:run']).toBe('bash scripts/agents/control.sh start quality_agent');
  });

  it('should have proper security scan script content', () => {
    const securityScriptPath = path.join(projectRoot, 'scripts', 'security-scan.sh');
    const content = fs.readFileSync(securityScriptPath, 'utf8');
    
    // Check for key security checks
    expect(content).toContain('Dependency Vulnerability Scan');
    expect(content).toContain('Secret Detection Scan');
    expect(content).toContain('Code Security Analysis');
    expect(content).toContain('Configuration Security');
    expect(content).toContain('Security Headers Check');
    expect(content).toContain('npm audit');
    expect(content).toContain('SQL injection');
    expect(content).toContain('XSS');
  });

  it('should have proper performance benchmark script content', () => {
    const performanceScriptPath = path.join(projectRoot, 'scripts', 'performance-benchmark.sh');
    const content = fs.readFileSync(performanceScriptPath, 'utf8');
    
    // Check for key performance tests
    expect(content).toContain('Build Performance');
    expect(content).toContain('Test Suite Performance');
    expect(content).toContain('Memory Usage Analysis');
    expect(content).toContain('File System Performance');
    expect(content).toContain('TypeScript Compilation Performance');
    expect(content).toContain('npm run build');
    expect(content).toContain('npm run test:unit');
  });

  it('should have QRA instructions documentation', () => {
    const qraInstructionsPath = path.join(projectRoot, 'QRA-INSTRUCTIONS.md');
    expect(fs.existsSync(qraInstructionsPath)).toBe(true);
    
    const content = fs.readFileSync(qraInstructionsPath, 'utf8');
    expect(content).toContain('Quality Review Agent');
    expect(content).toContain('85%');
    expect(content).toContain('Phase 1');
    expect(content).toContain('Phase 2');
    expect(content).toContain('Phase 3');
    expect(content).toContain('Phase 4');
    expect(content).toContain('Phase 5');
    expect(content).toContain('Phase 6');
  });

  it('should validate QRA execution constraints are documented', () => {
    const qraInstructionsPath = path.join(projectRoot, 'QRA-INSTRUCTIONS.md');
    const content = fs.readFileSync(qraInstructionsPath, 'utf8');
    
    // Check for the three execution constraints mentioned in the issue
    expect(content).toContain('85%'); // Test coverage requirement
    expect(content).toContain('security'); // Security scan requirement
    expect(content).toContain('performance'); // Performance benchmarks requirement
  });
});