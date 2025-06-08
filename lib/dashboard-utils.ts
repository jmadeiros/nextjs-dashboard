import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format
} from "date-fns"
import type { ViewType, CalendarData } from "@/components/dashboard/types"

/**
 * Get date range for dashboard data fetching based on view type
 */
export function getDashboardDateRange(view: ViewType, currentDate: Date, selectedDate: Date) {
  let startDate: Date, endDate: Date

  if (view === "day") {
    startDate = new Date(selectedDate)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(selectedDate)
    endDate.setHours(23, 59, 59, 999)
  } else if (view === "week") {
    startDate = startOfWeek(currentDate, { weekStartsOn: 0 })
    endDate = endOfWeek(currentDate, { weekStartsOn: 0 })
  } else {
    // Month view
    startDate = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    endDate = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
  }

  return { startDate, endDate }
}

/**
 * Generate calendar data for rendering
 */
export function getCalendarData(currentDate: Date): CalendarData {
  // Month view data
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDateMonth = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDateMonth = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calendarDays = eachDayOfInterval({ start: startDateMonth, end: endDateMonth })

  // Create 2D array for weeks in month view
  const calendarWeeks: Date[][] = []
  let week: Date[] = []

  calendarDays.forEach((day) => {
    week.push(day)
    if (week.length === 7) {
      calendarWeeks.push(week)
      week = []
    }
  })

  // Week view data
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  })

  return {
    monthStart,
    monthEnd,
    calendarDays,
    calendarWeeks,
    weekDays,
  }
}

/**
 * Get view title based on current view type and date
 */
export function getViewTitle(view: ViewType, currentDate: Date, isMobile: boolean): string {
  if (view === "day") {
    return format(currentDate, isMobile ? "MMM d, yyyy" : "EEEE, MMMM d, yyyy")
  } else if (view === "week") {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
    return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
  } else {
    return format(currentDate, "MMMM yyyy")
  }
} 