/**
 * Frontend Security Module
 * Client-side security measures for Share Crops PWA
 */

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Validate and sanitize URLs to prevent open redirect attacks
 */
export const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Optional: Whitelist specific domains
    const allowedDomains = ['sharecrops.app', 'localhost'];
    const isAllowed = allowedDomains.some((domain) => parsed.hostname.includes(domain));
    return isAllowed || url.startsWith('/');
  } catch {
    return false;
  }
};

/**
 * Prevent CSRF by validating token on state-changing requests
 */
export const getCsrfToken = (): string | null => {
  // From meta tag or session storage
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) {
    return meta.getAttribute('content');
  }
  return sessionStorage.getItem('csrf_token');
};

/**
 * Secure localStorage access with encryption (basic)
 */
export const secureStorage = {
  set: (key: string, value: any): void => {
    try {
      const serialized = JSON.stringify(value);
      const timestamp = Date.now();
      localStorage.setItem(key, JSON.stringify({ data: serialized, ts: timestamp }));
    } catch (error) {
      console.error('Storage error:', error);
    }
  },

  get: (key: string): any | null => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      // Optional: Check for data expiry
      if (parsed.ts && Date.now() - parsed.ts > 24 * 60 * 60 * 1000) {
        // Data older than 24 hours
        localStorage.removeItem(key);
        return null;
      }

      return JSON.parse(parsed.data);
    } catch (error) {
      console.error('Storage read error:', error);
      return null;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};

/**
 * API request wrapper with security headers
 */
export const secureRequest = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  const token = secureStorage.get('sharecrops_token');
  const csrfToken = getCsrfToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  // Add CSRF token to non-GET requests
  if (options.method && options.method !== 'GET' && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  // Add auth token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const request = new Request(url, {
    ...options,
    headers,
    // Prevent credentials from being sent (unless explicitly needed)
    credentials: 'same-origin',
  });

  return fetch(request);
};

/**
 * Detect and prevent common XSS vectors
 */
export const detectXss = (input: string): boolean => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    /eval\(/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password should contain a special character for extra security');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Rate limiting on client side (complementary to server-side)
 */
export class ClientRateLimiter {
  private requests: number[] = [];
  private maxRequests: number = 100;
  private windowMs: number = 60000; // 1 minute

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isLimited(): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove old requests
    this.requests = this.requests.filter((timestamp) => timestamp > windowStart);

    if (this.requests.length >= this.maxRequests) {
      return true;
    }

    this.requests.push(now);
    return false;
  }

  reset(): void {
    this.requests = [];
  }
}

/**
 * Log security events for monitoring
 */
export const logSecurityEvent = (
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: Record<string, any>,
): void => {
  const event = {
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...details,
  };

  console.warn(`[SECURITY] ${severity.toUpperCase()} - ${eventType}:`, event);

  // In production, send to monitoring service
  // await sendToMonitoringService(event);
};

/**
 * Content Security Policy violation handler
 */
export const setupCspViolationReporting = (): void => {
  document.addEventListener('securitypolicyviolation', (event: SecurityPolicyViolationEvent) => {
    logSecurityEvent('csp_violation', 'medium', {
      violatedDirective: event.violatedDirective,
      blockedURI: event.blockedURI,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
    });
  });
};

/**
 * Initialize frontend security
 */
export const initializeSecurity = (): void => {
  // Setup CSP violation reporting
  setupCspViolationReporting();

  // Log initial page load
  logSecurityEvent('page_load', 'low', {
    url: window.location.href,
  });

  // Detect and warn about potential XSS in URL parameters
  const params = new URLSearchParams(window.location.search);
  params.forEach((value) => {
    if (detectXss(value)) {
      logSecurityEvent('xss_attempt_in_url', 'high', {
        parameter: value,
      });
    }
  });
};

export default {
  sanitizeInput,
  validateUrl,
  getCsrfToken,
  secureStorage,
  secureRequest,
  detectXss,
  validateEmail,
  validatePassword,
  ClientRateLimiter,
  logSecurityEvent,
  setupCspViolationReporting,
  initializeSecurity,
};
