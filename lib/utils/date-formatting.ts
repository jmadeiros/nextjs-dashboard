import { format, parseISO, isValid } from 'date-fns'

// Safe date formatting that handles strings and Date objects
export function safeFormat(date: string | Date, formatString: string): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return 'Invalid date'
    return format(dateObj, formatString)
  } catch {
    return 'Invalid date'
  }
}

// Common date format functions
export const formatters = {
  // Display formats
  displayDate: (date: string | Date) => safeFormat(date, 'MMM d, yyyy'),
  displayDateTime: (date: string | Date) => safeFormat(date, 'MMM d, yyyy h:mm a'),
  displayTime: (date: string | Date) => safeFormat(date, 'h:mm a'),
  displayTime24: (date: string | Date) => safeFormat(date, 'HH:mm'),
  
  // Full formats
  fullDate: (date: string | Date) => safeFormat(date, 'EEEE, MMMM d, yyyy'),
  fullDateTime: (date: string | Date) => safeFormat(date, 'EEEE, MMMM d, yyyy h:mm a'),
  
  // ISO formats
  isoDate: (date: string | Date) => safeFormat(date, 'yyyy-MM-dd'),
  isoDateTime: (date: string | Date) => safeFormat(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
  
  // Calendar formats
  monthYear: (date: string | Date) => safeFormat(date, 'MMMM yyyy'),
  dayMonth: (date: string | Date) => safeFormat(date, 'd MMM'),
  weekday: (date: string | Date) => safeFormat(date, 'EEEE'),
  weekdayShort: (date: string | Date) => safeFormat(date, 'EEE'),
  
  // Compact formats
  compact: (date: string | Date) => safeFormat(date, 'MM/dd/yy'),
  compactTime: (date: string | Date) => safeFormat(date, 'H:mm'),
}

// Format a date range
export function formatDateRange(
  startDate: string | Date, 
  endDate: string | Date, 
  options: {
    sameDay?: boolean
    includeTime?: boolean
    compact?: boolean
  } = {}
): string {
  const { sameDay = false, includeTime = false, compact = false } = options
  
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
    
    if (!isValid(start) || !isValid(end)) return 'Invalid dates'
    
    if (sameDay) {
      const dateStr = compact ? formatters.compact(start) : formatters.displayDate(start)
      if (includeTime) {
        return `${dateStr} ${formatters.displayTime(start)} - ${formatters.displayTime(end)}`
      }
      return dateStr
    }
    
    if (includeTime) {
      return `${formatters.displayDateTime(start)} - ${formatters.displayDateTime(end)}`
    }
    
    if (compact) {
      return `${formatters.compact(start)} - ${formatters.compact(end)}`
    }
    
    return `${formatters.displayDate(start)} - ${formatters.displayDate(end)}`
  } catch {
    return 'Invalid dates'
  }
}

// Format time range
export function formatTimeRange(
  startTime: string | Date, 
  endTime: string | Date,
  format24h: boolean = false
): string {
  try {
    const formatter = format24h ? formatters.displayTime24 : formatters.displayTime
    return `${formatter(startTime)} - ${formatter(endTime)}`
  } catch {
    return 'Invalid times'
  }
}

// Get relative time (e.g., "2 hours ago", "in 3 days")
export function getRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return 'Invalid date'
    
    const now = new Date()
    const diffMs = dateObj.getTime() - now.getTime()
    const diffMins = Math.round(diffMs / (1000 * 60))
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    
    if (Math.abs(diffMins) < 1) return 'just now'
    if (Math.abs(diffMins) < 60) {
      return diffMins > 0 ? `in ${diffMins} minutes` : `${Math.abs(diffMins)} minutes ago`
    }
    if (Math.abs(diffHours) < 24) {
      return diffHours > 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`
    }
    if (Math.abs(diffDays) < 7) {
      return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`
    }
    
    // For longer periods, just show the date
    return formatters.displayDate(dateObj)
  } catch {
    return 'Invalid date'
  }
}

// Create a date with specific time (useful for form submissions)
export function createDateWithTime(date: Date, timeString: string): Date {
  try {
    const [hours, minutes] = timeString.split(':').map(Number)
    const newDate = new Date(date)
    newDate.setHours(hours, minutes, 0, 0)
    return newDate
  } catch {
    return date
  }
}

// Format date for database storage (UTC ISO string)
export function formatForDatabase(date: Date): string {
  return date.toISOString()
}

// Parse date from database (handles timezone)
export function parseFromDatabase(dateString: string): Date {
  return parseISO(dateString)
} 