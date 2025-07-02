# /sync-types

Synchronize TypeScript types from shared package to all consumers.

## Usage
```
/sync-types
```

## Description
Rebuilds the shared package and ensures all consuming packages have the latest type definitions.

## Implementation
```bash
#!/bin/bash
echo "Building @lrpdm/shared..."
pnpm --filter @lrpdm/shared build

echo "Type checking consuming packages..."
pnpm --filter "@lrpdm/*" --filter="!@lrpdm/shared" exec tsc --noEmit

echo "Types synchronized successfully!"
```