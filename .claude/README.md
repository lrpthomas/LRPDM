# Claude Code Configuration for LRPDM GIS Platform

This directory contains Claude Code configuration for the LRPDM monorepo.

## Structure

```
.claude/
├── settings.json           # Repository-wide security permissions
├── settings.local.json     # Personal overrides (gitignored)
├── commands/               # Custom slash commands
│   ├── test-spatial.md    # Run spatial-specific tests
│   ├── check-types.md     # TypeScript type checking
│   └── sync-types.md      # Synchronize shared types
└── README.md              # This file
```

## Configuration Hierarchy

1. **Root CLAUDE.md** - Repository-wide guidelines and monorepo rules
2. **Package CLAUDE.md** - Package-specific context in each workspace
3. **MCP Configuration** - Model Context Protocol servers for enhanced capabilities
4. **Security Settings** - Strict permissions for safe AI assistance

## Key Features

### Security-First Permissions
- Allowed: Development commands, file editing, git operations
- Denied: Destructive operations, network requests, sensitive file access

### Monorepo Support
- PNPM workspace commands configured
- Package filtering shortcuts
- Cross-package type synchronization

### Custom Commands
- `/test-spatial` - Run spatial-specific tests
- `/check-types` - TypeScript type checking
- `/sync-types` - Synchronize shared package types

## Usage

1. **Initialize Claude Code** in the repository root:
   ```bash
   claude
   ```

2. **Use workspace commands** from root:
   ```bash
   pnpm --filter @lrpdm/api dev
   pnpm --filter @lrpdm/web test
   ```

3. **Access custom commands** in Claude:
   ```
   /test-spatial api
   /check-types
   /sync-types
   ```

## Local Customization

Create `.claude/settings.local.json` for personal preferences:
```json
{
  "shortcuts": {
    "db": "docker exec -it postgres psql"
  }
}
```

## MCP Servers

Three MCP servers are configured:
- **filesystem** - File operations with safety checks
- **git** - Version control operations
- **postgres** - Direct database access with PostGIS support

## Best Practices

1. Always run commands from repository root
2. Use `--filter` for package-specific operations
3. Let Claude handle file edits through proper APIs
4. Review all suggested changes before committing

## Troubleshooting

- **Path issues**: Ensure you're in the repository root
- **Permission denied**: Check settings.json for allowed operations
- **MCP errors**: Verify DATABASE_URL environment variable
- **Type errors**: Run `/sync-types` to update definitions