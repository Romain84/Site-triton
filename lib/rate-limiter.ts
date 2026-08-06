/**
 * Simple in-memory rate limiter
 * Tracks requests per IP address
 * Free tier limits for Gemini Flash: 15 requests per minute
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>()

  // Limits
  private readonly maxRequestsPerMinute = 15 // Gemini Flash free tier
  private readonly maxRequestsPerDay = 1500 // Additional safety limit
  private readonly windowMs = 60 * 1000 // 1 minute
  private readonly dayMs = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Check if a request is allowed
   * @param ip IP address of the requester
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  checkLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number; message?: string } {
    const now = Date.now()
    const minuteKey = `${ip}:minute`
    const dayKey = `${ip}:day`

    // Check minute limit
    const minuteEntry = this.requests.get(minuteKey)
    if (minuteEntry) {
      if (now < minuteEntry.resetTime) {
        // Within the current window
        if (minuteEntry.count >= this.maxRequestsPerMinute) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: minuteEntry.resetTime,
            message: 'Limite de requêtes par minute atteinte. Veuillez patienter.',
          }
        }
      } else {
        // Window expired, reset
        this.requests.delete(minuteKey)
      }
    }

    // Check day limit
    const dayEntry = this.requests.get(dayKey)
    if (dayEntry) {
      if (now < dayEntry.resetTime) {
        // Within the current day
        if (dayEntry.count >= this.maxRequestsPerDay) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: dayEntry.resetTime,
            message: 'Limite quotidienne atteinte. Le chatbot est temporairement indisponible.',
          }
        }
      } else {
        // Day expired, reset
        this.requests.delete(dayKey)
      }
    }

    // Increment counters
    const minuteResetTime = minuteEntry?.resetTime && now < minuteEntry.resetTime
      ? minuteEntry.resetTime
      : now + this.windowMs

    const dayResetTime = dayEntry?.resetTime && now < dayEntry.resetTime
      ? dayEntry.resetTime
      : now + this.dayMs

    this.requests.set(minuteKey, {
      count: (minuteEntry?.count || 0) + 1,
      resetTime: minuteResetTime,
    })

    this.requests.set(dayKey, {
      count: (dayEntry?.count || 0) + 1,
      resetTime: dayResetTime,
    })

    const remaining = Math.min(
      this.maxRequestsPerMinute - ((minuteEntry?.count || 0) + 1),
      this.maxRequestsPerDay - ((dayEntry?.count || 0) + 1)
    )

    return {
      allowed: true,
      remaining,
      resetTime: minuteResetTime,
    }
  }

  /**
   * Check rate limit status without incrementing the count
   */
  checkLimitReadOnly(ip: string): { allowed: boolean; remaining: number; resetTime: number; message?: string } {
    const now = Date.now()
    const minuteKey = `${ip}:minute`
    const dayKey = `${ip}:day`

    const minuteEntry = this.requests.get(minuteKey)
    if (minuteEntry && now < minuteEntry.resetTime && minuteEntry.count >= this.maxRequestsPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: minuteEntry.resetTime,
        message: 'Limite de requêtes par minute atteinte. Veuillez patienter.',
      }
    }

    const dayEntry = this.requests.get(dayKey)
    if (dayEntry && now < dayEntry.resetTime && dayEntry.count >= this.maxRequestsPerDay) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: dayEntry.resetTime,
        message: 'Limite quotidienne atteinte. Le chatbot est temporairement indisponible.',
      }
    }

    const minuteCount = minuteEntry && now < minuteEntry.resetTime ? minuteEntry.count : 0
    const dayCount = dayEntry && now < dayEntry.resetTime ? dayEntry.count : 0

    const remaining = Math.min(
      this.maxRequestsPerMinute - minuteCount,
      this.maxRequestsPerDay - dayCount
    )

    const resetTime = minuteEntry && now < minuteEntry.resetTime
      ? minuteEntry.resetTime
      : now + this.windowMs

    return {
      allowed: true,
      remaining,
      resetTime,
    }
  }

  /**
   * Get current usage stats for an IP
   */
  getStats(ip: string): { minuteCount: number; dayCount: number } {
    const minuteKey = `${ip}:minute`
    const dayKey = `${ip}:day`
    const now = Date.now()

    const minuteEntry = this.requests.get(minuteKey)
    const dayEntry = this.requests.get(dayKey)

    return {
      minuteCount: minuteEntry && now < minuteEntry.resetTime ? minuteEntry.count : 0,
      dayCount: dayEntry && now < dayEntry.resetTime ? dayEntry.count : 0,
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.requests.entries()) {
      if (now >= entry.resetTime) {
        toDelete.push(key)
      }
    }

    for (const key of toDelete) {
      this.requests.delete(key)
    }
  }
}

// Export a singleton instance for chatbot
export const rateLimiter = new RateLimiter()

/**
 * Form-specific rate limiter with stricter limits
 * Used for contact forms, registration forms, etc.
 */
class FormRateLimiter {
  private requests = new Map<string, RateLimitEntry>()

  // Stricter limits for forms to prevent spam
  private readonly maxRequestsPerMinute = 3 // 3 submissions per minute max per IP
  private readonly maxRequestsPerHour = 5 // 5 submissions per hour max per IP
  private readonly windowMs = 60 * 1000 // 1 minute
  private readonly hourMs = 60 * 60 * 1000 // 1 hour

  constructor() {
    // Clean up old entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000)
  }

  /**
   * Check if a form submission is allowed
   * @param ip IP address of the requester
   * @param formType Type of form (contact, inscription, etc.)
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  checkLimit(ip: string, formType: string = 'default'): { allowed: boolean; remaining: number; resetTime: number; message?: string } {
    const now = Date.now()
    const minuteKey = `${ip}:${formType}:minute`
    const hourKey = `${ip}:${formType}:hour`

    // Check minute limit
    const minuteEntry = this.requests.get(minuteKey)
    if (minuteEntry) {
      if (now < minuteEntry.resetTime) {
        if (minuteEntry.count >= this.maxRequestsPerMinute) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: minuteEntry.resetTime,
            message: 'Trop de soumissions. Veuillez patienter une minute avant de réessayer.',
          }
        }
      } else {
        this.requests.delete(minuteKey)
      }
    }

    // Check hour limit
    const hourEntry = this.requests.get(hourKey)
    if (hourEntry) {
      if (now < hourEntry.resetTime) {
        if (hourEntry.count >= this.maxRequestsPerHour) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: hourEntry.resetTime,
            message: 'Limite horaire atteinte. Veuillez réessayer plus tard.',
          }
        }
      } else {
        this.requests.delete(hourKey)
      }
    }

    // Increment counters
    const minuteResetTime = minuteEntry?.resetTime && now < minuteEntry.resetTime
      ? minuteEntry.resetTime
      : now + this.windowMs

    const hourResetTime = hourEntry?.resetTime && now < hourEntry.resetTime
      ? hourEntry.resetTime
      : now + this.hourMs

    this.requests.set(minuteKey, {
      count: (minuteEntry?.count || 0) + 1,
      resetTime: minuteResetTime,
    })

    this.requests.set(hourKey, {
      count: (hourEntry?.count || 0) + 1,
      resetTime: hourResetTime,
    })

    const remaining = Math.min(
      this.maxRequestsPerMinute - ((minuteEntry?.count || 0) + 1),
      this.maxRequestsPerHour - ((hourEntry?.count || 0) + 1)
    )

    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      resetTime: minuteResetTime,
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.requests.entries()) {
      if (now >= entry.resetTime) {
        toDelete.push(key)
      }
    }

    for (const key of toDelete) {
      this.requests.delete(key)
    }
  }
}

// Export a singleton instance for forms
export const formRateLimiter = new FormRateLimiter()
