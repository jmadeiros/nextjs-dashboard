import { format, isSameDay, parseISO, isWeekend, isSaturday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import type { Database } from '@/types/supabase'

type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type ContractorVisit = Database["public"]["Tables"]["contractor_visits"]["Row"]
type GuestVisit = Database["public"]["Tables"]["guest_visits"]["Row"]

// Define a unified event type for calendar display
export type ConsolidatedEvent = {
  id: string
  title: string
  start: Date
  end: Date
  type: "room" | "contractor" | "partner"
  roomId?: string
  description?: string | null
  color: string
  colorClass: string
  borderClass: string
  lightClass: string
  entityId: string
  entityName: string
  isRecurring?: boolean
  roomName?: string | null
  bookedBy?: string | null
}

// Get events for a specific day
export function getEventsForDay(day: Date, events: ConsolidatedEvent[]): ConsolidatedEvent[] {
  return events.filter(event => 
    isSameDay(event.start, day) || 
    (event.start <= day && event.end >= day)
  )
}

// Get bookings for a specific day
export function getBookingsForDay(day: Date, bookings: Booking[]): Booking[] {
  return bookings.filter(booking => {
    const bookingStart = parseISO(booking.start_time)
    const bookingEnd = parseISO(booking.end_time)
    return isSameDay(bookingStart, day) || (bookingStart <= day && bookingEnd >= day)
  })
}

// Get contractor visits for a specific day
export function getContractorVisitsForDay(day: Date, visits: ContractorVisit[]): ContractorVisit[] {
  return visits.filter(visit => {
    const visitDate = parseISO(visit.visit_date)
    return isSameDay(visitDate, day)
  })
}

// Get guest visits for a specific day
export function getGuestVisitsForDay(day: Date, visits: GuestVisit[]): GuestVisit[] {
  return visits.filter(visit => {
    const visitDate = parseISO(visit.visit_date)
    return isSameDay(visitDate, day)
  })
}

// Format time range for display
export function formatTimeRange(startTime: string, endTime: string): string {
  try {
    const start = parseISO(startTime)
    const end = parseISO(endTime)
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
  } catch {
    return `${startTime} - ${endTime}`
  }
}

// Format time range in compact format
export function formatTimeRangeCompact(startTime: string, endTime: string): string {
  try {
    const start = parseISO(startTime)
    const end = parseISO(endTime)
    return `${format(start, 'H:mm')}-${format(end, 'H:mm')}`
  } catch {
    return `${startTime}-${endTime}`
  }
}

// Get calendar day class names for styling
export function getCalendarDayClasses(
  day: Date, 
  selectedDate: Date, 
  currentMonth: Date,
  hasEvents: boolean = false
): string {
  const classes = ['calendar-day']
  
  if (isSameDay(day, selectedDate)) {
    classes.push('selected')
  }
  
  if (day.getMonth() !== currentMonth.getMonth()) {
    classes.push('other-month')
  }
  
  if (isWeekend(day)) {
    classes.push('weekend')
  }
  
  if (isSaturday(day)) {
    classes.push('saturday')
  }
  
  if (hasEvents) {
    classes.push('has-events')
  }
  
  return classes.join(' ')
}

// Get color intensity based on event count
export function getColorIntensity(count: number): string {
  if (count === 0) return "bg-muted/20"
  if (count <= 2) return "bg-primary/20"
  if (count <= 5) return "bg-primary/40"
  return "bg-primary/70 text-primary-foreground"
}

// Check if two dates are the same day (utility function)
export function isSameDayUtil(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Get view title for calendar navigation
export function getViewTitle(date: Date, view: 'month' | 'week' | 'day'): string {
  switch (view) {
    case 'day':
      return format(date, 'EEEE, MMMM d, yyyy')
    case 'week':
      return format(date, "'Week of' MMMM d, yyyy")
    case 'month':
    default:
      return format(date, 'MMMM yyyy')
  }
}

// Get calendar weeks for month view
export function getCalendarWeeks(currentDate: Date): Date[][] {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDateMonth = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDateMonth = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: startDateMonth, end: endDateMonth })

  // Create a 2D array for weeks in month view
  const calendarWeeks: Date[][] = []
  let week: Date[] = []

  calendarDays.forEach((day) => {
    week.push(day)
    if (week.length === 7) {
      calendarWeeks.push(week)
      week = []
    }
  })

  return calendarWeeks
}

// Get event icon type based on event type
export function getEventIcon(type: string, title?: string): { icon: string; className: string } {
  switch (type) {
    case "room":
      return { icon: "DoorOpen", className: "h-3 w-3 mr-1 shrink-0" }
    case "contractor":
      // Check if it's a volunteer based on the title
      const isVolunteer = title?.includes("(Vol)")
      return { 
        icon: isVolunteer ? "Users" : "HardHat", 
        className: "h-3 w-3 mr-1 shrink-0" 
      }
    case "partner":
      return { icon: "Users", className: "h-3 w-3 mr-1 shrink-0" }
    default:
      return { icon: "Clock", className: "h-3 w-3 mr-1 shrink-0" }
  }
} 