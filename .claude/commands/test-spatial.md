# /test-spatial

Run spatial-specific tests across the monorepo.

## Usage
```
/test-spatial [package]
```

## Examples
```
/test-spatial          # Run all spatial tests
/test-spatial api      # Run API spatial tests only
/test-spatial shared   # Run shared spatial utility tests
```

## Implementation
```bash
#!/bin/bash
if [ -z "$1" ]; then
  pnpm test -- --testPathPattern="spatial|geometry|postgis"
else
  pnpm --filter @lrpdm/$1 test -- --testPathPattern="spatial|geometry|postgis"
fi
```