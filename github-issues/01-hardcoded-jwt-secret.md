# [SECURITY] Hardcoded JWT Secret Key Vulnerability

## 🔒 Security Issue Description

**Severity**: Critical

**Component**: Authentication

**Description**: 
The JWT secret key has a hardcoded fallback value 'your-secret-key' which compromises authentication security in production environments.

## 📍 Location
**File(s)**: 
- `src/routes/auth.ts:25`

**Code snippet**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
```

## 🚨 Security Impact
- [x] Authentication bypass
- [x] Data exposure
- [ ] SQL injection
- [ ] XSS vulnerability
- [ ] CSRF vulnerability

**Details**: If the JWT_SECRET environment variable is not set, the application will use 'your-secret-key' as the secret. This is a well-known value that could allow attackers to forge JWT tokens and bypass authentication.

## 🔧 Proposed Solution
1. Remove the hardcoded fallback value
2. Make JWT_SECRET a required environment variable
3. Add startup validation to ensure JWT_SECRET is set
4. Update deployment documentation

```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}
```

## 📋 Acceptance Criteria
- [ ] Hardcoded JWT secret is removed
- [ ] Application fails to start if JWT_SECRET is not provided
- [ ] All existing tokens are invalidated (users need to re-login)
- [ ] Deployment documentation is updated
- [ ] Security testing is added

## 🔗 References
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc7519)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)