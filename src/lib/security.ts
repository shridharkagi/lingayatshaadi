/**
 * Security utility functions for input sanitization and validation
 */

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  
  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, "");
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, "");
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");
  
  // Remove data: protocol (except images)
  sanitized = sanitized.replace(/data:(?!image\/)/gi, "");
  
  return sanitized;
}

/**
 * Sanitize text input (for names, descriptions, etc.)
 */
export function sanitizeText(input: string): string {
  if (!input) return "";
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, "");
  
  // Remove any remaining < or > characters
  sanitized = sanitized.replace(/[<>]/g, "");
  
  return sanitized.trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Indian format)
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");
  
  // Check if it's 10 digits (Indian mobile) or starts with country code
  return cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith("91"));
}

/**
 * Sanitize phone number to digits only
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Prevent right-click on images
 */
export function preventImageDownload(element: HTMLElement) {
  element.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  });
  
  element.addEventListener("dragstart", (e) => {
    e.preventDefault();
    return false;
  });
  
  // Add CSS to prevent selection
  element.style.userSelect = "none";
  element.style.webkitUserSelect = "none";
}

/**
 * Rate limiting helper (client-side)
 */
export class RateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  private timeWindow: number;

  constructor(maxCalls: number, timeWindowMs: number) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindowMs;
  }

  canMakeCall(): boolean {
    const now = Date.now();
    
    // Remove calls outside the time window
    this.calls = this.calls.filter((time) => now - time < this.timeWindow);
    
    // Check if we can make another call
    if (this.calls.length < this.maxCalls) {
      this.calls.push(now);
      return true;
    }
    
    return false;
  }

  getRemainingCalls(): number {
    const now = Date.now();
    this.calls = this.calls.filter((time) => now - time < this.timeWindow);
    return Math.max(0, this.maxCalls - this.calls.length);
  }
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll events
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
}
