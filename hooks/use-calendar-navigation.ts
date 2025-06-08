import { useState } from 'react'
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns'

export type ViewType = 'day' | 'week' | 'month'

export function useCalendarNavigation(initialDate = new Date(), initialView: ViewType = 'month') {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate)
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate)
  const [view, setView] = useState<ViewType>(initialView)

  const navigatePrevious = () => {
    setCurrentDate(prev => {
      switch (view) {
        case 'day':
          return subDays(prev, 1)
        case 'week':
          return subWeeks(prev, 1)
        case 'month':
          return subMonths(prev, 1)
        default:
          return prev
      }
    })
  }

  const navigateNext = () => {
    setCurrentDate(prev => {
      switch (view) {
        case 'day':
          return addDays(prev, 1)
        case 'week':
          return addWeeks(prev, 1)
        case 'month':
          return addMonths(prev, 1)
        default:
          return prev
      }
    })
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const changeView = (newView: ViewType) => {
    setView(newView)
  }

  return {
    currentDate,
    selectedDate,
    view,
    setCurrentDate,
    setSelectedDate,
    navigatePrevious,
    navigateNext,
    goToToday,
    changeView,
  }
} 