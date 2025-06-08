// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Phone validation (basic)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
}

// Date validation
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

// Time validation (HH:MM format)
export function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

// Check if end time is after start time
export function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
  if (!isValidTime(startTime) || !isValidTime(endTime)) return false
  
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  
  return endMinutes > startMinutes
}

// Required field validation
export function isRequired(value: any): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return value !== null && value !== undefined
}

// Minimum length validation
export function hasMinLength(value: string, minLength: number): boolean {
  return value.trim().length >= minLength
}

// Maximum length validation
export function hasMaxLength(value: string, maxLength: number): boolean {
  return value.trim().length <= maxLength
}

// Future date validation
export function isFutureDate(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date >= today
}

// Business hours validation (9 AM to 6 PM)
export function isWithinBusinessHours(time: string): boolean {
  if (!isValidTime(time)) return false
  
  const [hour] = time.split(':').map(Number)
  return hour >= 9 && hour < 18
}

// Common validation rules
export const validationRules = {
  required: (value: any) => isRequired(value) ? null : 'This field is required',
  
  email: (value: string) => {
    if (!value) return null // Allow empty if not required
    return isValidEmail(value) ? null : 'Please enter a valid email address'
  },
  
  phone: (value: string) => {
    if (!value) return null // Allow empty if not required
    return isValidPhone(value) ? null : 'Please enter a valid phone number'
  },
  
  time: (value: string) => {
    if (!value) return null
    return isValidTime(value) ? null : 'Please enter a valid time (HH:MM)'
  },
  
  timeRange: (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return null
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return 'Please enter valid times'
    }
    return isEndTimeAfterStartTime(startTime, endTime) ? null : 'End time must be after start time'
  },
  
  futureDate: (date: Date) => {
    if (!date) return null
    return isFutureDate(date) ? null : 'Date must be in the future'
  },
  
  minLength: (minLength: number) => (value: string) => {
    if (!value) return null
    return hasMinLength(value, minLength) ? null : `Must be at least ${minLength} characters`
  },
  
  maxLength: (maxLength: number) => (value: string) => {
    if (!value) return null
    return hasMaxLength(value, maxLength) ? null : `Must be no more than ${maxLength} characters`
  },
}

// Combine multiple validation rules
export function combineValidators(...validators: Array<(value: any) => string | null>) {
  return (value: any): string | null => {
    for (const validator of validators) {
      const error = validator(value)
      if (error) return error
    }
    return null
  }
}

// Validate an entire form object
export function validateForm<T extends Record<string, any>>(
  values: T, 
  rules: Partial<Record<keyof T, (value: any, values?: T) => string | null>>
): Record<string, string> | null {
  const errors: Record<string, string> = {}
  
  for (const [field, validator] of Object.entries(rules)) {
    if (validator) {
      const error = validator(values[field], values)
      if (error) {
        errors[field] = error
      }
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null
} 