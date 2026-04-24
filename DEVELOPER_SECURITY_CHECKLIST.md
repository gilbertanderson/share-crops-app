# 🔐 Developer Security Checklist

Use this checklist when adding new features or endpoints to Share Crops app.

## Backend (Edge Function) Checklist

### ✅ Input Validation

- [ ] All user input validated with `security.validateInput()`
- [ ] String lengths checked (min/max)
- [ ] Email format validated before auth
- [ ] UUID format validated for database lookups
- [ ] Numbers checked for range (prevent overflow)
- [ ] Arrays size-limited (prevent large payloads)

### ✅ Security Modules Applied

- [ ] Rate limiting middleware active on route
- [ ] Security headers present on response
- [ ] CORS properly configured
- [ ] Error messages don't leak sensitive info

### ✅ Authentication & Authorization

- [ ] Token validated with `security.validateJwtStructure()`
- [ ] User existence verified after token auth
- [ ] User ID matches authentication
- [ ] Ownership checks for resource operations
- [ ] Authorization errors return 403/401 appropriately

### ✅ Data Protection

- [ ] All user input sanitized with `security.sanitizeString()`
- [ ] No raw SQL queries (use parameterized queries)
- [ ] Sensitive data not logged
- [ ] Passwords hashed (Supabase handles this)
- [ ] SQL injection prevention with `validateQuerySafety()`

### ✅ Logging & Monitoring

- [ ] Security events logged with `logSecurityEvent()`
- [ ] Failures include severity level (low/medium/high/critical)
- [ ] User actions logged for audit trail
- [ ] Suspicious activity logged immediately
- [ ] No credentials/tokens logged

### ✅ Error Handling

- [ ] Try-catch blocks wrap all async operations
- [ ] Generic error messages to users (specific in logs)
- [ ] No stack traces exposed to frontend
- [ ] Graceful degradation on failures
- [ ] Timeouts prevent hanging requests

### Code Review Template

```typescript
// ❌ BAD - No validation
app.post("/api/endpoint", async (c) => {
  const { email, name } = await c.req.json();
  await kv.set(`user:${email}`, { name }); // Direct storage!
  return c.json({ success: true });
});

// ✅ GOOD - Validated & Sanitized
app.post("/api/endpoint", async (c) => {
  const user = await getAuthUser(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const { email, name } = await c.req.json();

  // Validate
  const emailVal = security.validateInput(email, "email");
  if (!emailVal.valid) return c.json({ error: emailVal.error }, 400);

  // Prevent SQL injection
  const sqlSafe = security.validateQuerySafety(name);
  if (!sqlSafe.safe) return c.json({ error: "Invalid input" }, 400);

  // Sanitize before storage
  await kv.set(`user:${email}`, { name: security.sanitizeString(name) });

  security.logSecurityEvent("endpoint_called", "low", { userId: user.id });
  return c.json({ success: true });
});
```

---

## Frontend (React App) Checklist

### ✅ Input Validation

- [ ] Email validated before sending to API
- [ ] Password strength checked with `validatePassword()`
- [ ] User input checked for XSS with `detectXss()`
- [ ] URLs validated with `validateUrl()`
- [ ] Form fields have max length constraints

### ✅ Data Protection

- [ ] Sensitive data stored with `secureStorage.set()`
- [ ] Tokens stored securely (not in plain localStorage)
- [ ] PII not logged to console
- [ ] API responses checked for security

### ✅ API Communication

- [ ] All requests use `secureRequest()` wrapper
- [ ] CSRF tokens included on mutations
- [ ] Authorization headers sent correctly
- [ ] Error responses handled securely
- [ ] No sensitive data in URLs/query params

### ✅ Rendering Safety

- [ ] User input sanitized with `sanitizeInput()`
- [ ] XSS prevention for dynamic content
- [ ] Content-Security-Policy headers respected
- [ ] No `innerHTML` with user input
- [ ] No `eval()` or `Function()` constructor

### ✅ Session Management

- [ ] Tokens cleared on logout
- [ ] Session timeout implemented
- [ ] Re-authentication required for sensitive ops
- [ ] "Remember me" not overly permissive
- [ ] Cookies marked HttpOnly (if using cookies)

### ✅ Error Handling

- [ ] Generic error messages to users
- [ ] Detailed errors in console/logs only
- [ ] No credential exposure in errors
- [ ] User-friendly failure messages
- [ ] Fallback UI for failed operations

### Code Review Template

```typescript
// ❌ BAD - Direct DOM manipulation, no validation
const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  document.getElementById('output').innerHTML = value; // XSS vulnerability!
};

// ✅ GOOD - Sanitized & validated
import { sanitizeInput, validateEmail } from '@/utils/security';

const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;

  // Validate
  const emailVal = validateEmail(value);
  if (!emailVal) {
    console.warn('Invalid email format');
    return;
  }

  // Sanitize
  const safe = sanitizeInput(value);
  setEmail(safe); // Use state, not direct DOM
};

const EmailDisplay = ({ email }: { email: string }) => {
  // Sanitization happens in state, rendering is safe
  return <div>{sanitizeInput(email)}</div>;
};
```

---

## Database Security Checklist

### ✅ KV Store Operations

- [ ] Keys use consistent naming convention
- [ ] No sensitive data in key names
- [ ] Values are validated before storage
- [ ] Data sanitized before storage
- [ ] Expiration handled for temporary data
- [ ] Delete operations complete on all replicas

### ✅ Data Structure

- [ ] Sensitive fields encrypted/hashed
- [ ] Timestamps on all records
- [ ] User ID matches authorization context
- [ ] No cross-user data access
- [ ] Deleted data actually removed (not soft-deleted without reason)

---

## API Security Checklist

### ✅ Endpoint Design

- [ ] Consistent error codes (400, 401, 403, 404, 429, 500)
- [ ] Idempotent operations use PUT/PATCH
- [ ] Mutable operations use POST
- [ ] DELETE operations safe and reversible
- [ ] GET operations never mutate state

### ✅ Rate Limiting

- [ ] All public endpoints rate limited
- [ ] Rate limit increases with authentication
- [ ] Rate limit headers sent in response
- [ ] Limits documented in API spec
- [ ] Monitor for abuse patterns

### ✅ Version Control

- [ ] API versioning strategy documented
- [ ] Deprecated endpoints marked
- [ ] Breaking changes require new version
- [ ] Old versions supported for 6 months
- [ ] Changelog maintained

---

## Deployment Security Checklist

### ✅ Pre-Deployment

- [ ] Security tests pass
- [ ] No console errors/warnings
- [ ] Rate limiting configured
- [ ] CORS whitelist updated
- [ ] Environment variables set
- [ ] Secrets not in code
- [ ] Dependencies updated

### ✅ Post-Deployment

- [ ] Monitor error logs
- [ ] Check security logs for anomalies
- [ ] Performance metrics normal
- [ ] Rate limiting working
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] Users can access new features

### ✅ Rollback Procedure

- [ ] Previous version available
- [ ] Rollback procedure documented
- [ ] Database migrations reversible
- [ ] Users notified of issues
- [ ] Post-incident review completed

---

## Testing Security Checklist

### ✅ Unit Tests

- [ ] Input validation tests
- [ ] Sanitization tests
- [ ] Auth tests
- [ ] Error handling tests

### ✅ Integration Tests

- [ ] Rate limiting tests
- [ ] CORS tests
- [ ] Full request/response cycle
- [ ] Error codes correct

### ✅ Security Tests

- [ ] XSS payload handling
- [ ] SQL injection payload handling
- [ ] CSRF token validation
- [ ] Rate limit enforcement
- [ ] Authorization checks
- [ ] Authentication failures

### Sample Security Test

```typescript
// Test: SQL injection prevention
test("Should reject SQL injection attempts", async () => {
  const payload = { title: "Test; DROP TABLE listings--" };
  const response = await secureRequest("/listings", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  expect(response.status).toBe(400);
  expect(await response.json()).toHaveProperty("error");
});

// Test: Rate limiting
test("Should enforce rate limiting", async () => {
  for (let i = 0; i < 101; i++) {
    const response = await secureRequest("/listings");
    if (i < 100) {
      expect(response.status).toBe(200);
    } else {
      expect(response.status).toBe(429); // Too Many Requests
    }
  }
});
```

---

## Documentation Checklist

When adding new features, document:

- [ ] Security considerations
- [ ] Input validation requirements
- [ ] Error codes and meanings
- [ ] Rate limiting applied
- [ ] Authorization rules
- [ ] Data handling (storage, encryption)
- [ ] Audit logging
- [ ] Example requests with security headers

---

## Common Vulnerabilities to Avoid

| Vulnerability            | Prevention                               | Check                      |
| ------------------------ | ---------------------------------------- | -------------------------- |
| SQL Injection            | Parameterized queries, input validation  | ✅ `validateQuerySafety()` |
| XSS                      | Input sanitization, output encoding      | ✅ `sanitizeString()`      |
| CSRF                     | Token validation, SameSite cookies       | ✅ `getCsrfToken()`        |
| CORS                     | Origin whitelist, credentials config     | ✅ CORS middleware         |
| Auth Bypass              | Token validation, user verification      | ✅ `getAuthUser()`         |
| Rate Limiting            | Per-IP tracking, exponential backoff     | ✅ `rateLimit()`           |
| Information Disclosure   | Generic error messages, no stack traces  | ✅ Error handling          |
| Broken Access Control    | Ownership checks, authorization          | ✅ User ID validation      |
| XXE                      | Disable external entities in XML parsers | ✅ (if using XML)          |
| Insecure Deserialization | Input validation, type checking          | ✅ `validateInput()`       |

---

## Security References

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Supabase Security Docs](https://supabase.com/docs/guides/security)

---

## Questions?

Ask in: #security channel or contact security@sharecrops.app

**Last Updated:** April 24, 2026  
**Version:** 1.0
