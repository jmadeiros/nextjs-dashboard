import { format } from "date-fns"

/**
 * Formats a time string or Date object without showing ":00" for times on the hour
 * @param time - Time string (HH:mm format) or Date object
 * @returns Formatted time string (e.g., "9 AM" instead of "9:00 AM")
 */
export function formatTime(time: string | Date): string {
  try {
    let date: Date

    if (typeof time === "string") {
      // Handle time string in HH:mm format
      date = new Date(`2000-01-01T${time}`)
    } else {
      // Handle Date object
      date = time
    }

    // Use different format based on whether minutes are 00
    return date.getMinutes() === 0 ? format(date, "h a") : format(date, "h:mm a")
  } catch {
    return ""
  }
}

/**
 * Formats a time range without showing ":00" for times on the hour
 * @param startTime - Start time string (HH:mm format) or Date object
 * @param endTime - End time string (HH:mm format) or Date object
 * @returns Formatted time range string (e.g., "9 AM - 5 PM")
 */
export function formatTimeRange(startTime: string | Date, endTime: string | Date): string {
  try {
    const start = formatTime(startTime)
    const end = formatTime(endTime)
    return `${start} - ${end}`
  } catch {
    return ""
  }
}
