# GitHub Actions Configuration

## Current Status
The spatial validation and CI/CD workflows have been temporarily disabled (renamed to .backup) because they require:

1. **GitHub Secrets Configuration**:
   - `POSTGRES_PASSWORD` - Add this in repository Settings > Secrets

2. **Missing npm scripts in package.json**:
   ```json
   "scripts": {
     "test:spatial:validation": "echo 'Add spatial validation tests'",
     "test:spatial:performance": "echo 'Add performance tests'"
   }
   ```

3. **Test files** that don't exist yet

## To Re-enable Workflows:
1. Add the required secrets in GitHub
2. Add the test scripts to package.json
3. Rename the .backup files back to .yml:
   - `spatial-validation.yml.backup` → `spatial-validation.yml`
   - `spatial-ci-matrix.yml.backup` → `spatial-ci-matrix.yml`

## Active Workflows:
- `claude-code-review.yml` - Code review automation (currently active)