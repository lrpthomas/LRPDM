# /check-types

Run TypeScript type checking across all packages in the monorepo.

## Usage
```
/check-types [package]
```

## Examples
```
/check-types          # Check all packages
/check-types api      # Check API package only
/check-types web      # Check web package only
```

## Implementation
```bash
#!/bin/bash
if [ -z "$1" ]; then
  pnpm -r exec tsc --noEmit
else
  pnpm --filter @lrpdm/$1 exec tsc --noEmit
fi
```