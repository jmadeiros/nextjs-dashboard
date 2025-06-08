import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { format, parseISO, isSameDay, addDays, addWeeks, subWeeks, addMonths, subMonths } from "date-fns"
import { getSupabaseClient } from "@/lib/supabase-client"
import { getDashboardDateRange } from "@/lib/dashboard-utils"
import type { Room, Booking, ViewType, DashboardState, DashboardActions } from "@/components/dashboard/types"

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

export function useDashboard(rooms: Room[], userId: string) {
  // State management
  const [state, setState] = useState<DashboardState>({
    currentDate: new Date(),
    selectedDate: new Date(),
    selectedRoom: null,
    bookings: [],
    isBookingFormOpen: false,
    isLoading: true,
    view: "month" as ViewType,
    selectedDateBookings: [],
    bookingFormRoom: null,
    fetchError: null,
    showAllRooms: true,
    lastRefreshTime: new Date(),
  })

  // Refs for fetch management
  const fetchInProgress = useRef(false)
  const retryCount = useRef(0)
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()

  // Diagnostic logging
  useEffect(() => {
    console.log("[Dashboard] Component mounted")
    return () => console.log("[Dashboard] Component unmounted")
  }, [])

  // URL parameter handling
  useEffect(() => {
    const viewParam = searchParams.get("view")
    if (viewParam === "all") {
      setState(prev => ({ ...prev, showAllRooms: true, selectedRoom: null }))
    } else if (!viewParam) {
      setState(prev => ({ ...prev, showAllRooms: true, selectedRoom: null }))
    }
  }, [searchParams])

  // Memoized fetch function
  const fetchBookings = useCallback(
    async (forceRefresh = false) => {
      if (!state.selectedRoom && !state.showAllRooms && !forceRefresh) return
      if (fetchInProgress.current && !forceRefresh) return

      console.log(`[Dashboard] Starting fetchBookings (force: ${forceRefresh})`)
      setState(prev => ({ ...prev, isLoading: true, fetchError: null }))
      fetchInProgress.current = true

      const { startDate, endDate } = getDashboardDateRange(state.view, state.currentDate, state.selectedDate)

      try {
        console.log(
          `[Dashboard] Fetching bookings for ${state.view} view from ${startDate.toISOString()} to ${endDate.toISOString()}`
        )

        let query = supabase
          .from("bookings")
          .select("*")
          .gte("start_time", startDate.toISOString())
          .lte("end_time", endDate.toISOString())
          .order("start_time")

        // Filter by room if specific room selected
        if (state.selectedRoom && !state.showAllRooms) {
          console.log(`[Dashboard] Filtering by room: ${state.selectedRoom.id} (${state.selectedRoom.name})`)
          query = query.eq("room_id", state.selectedRoom.id)
        }

        const { data, error } = await query

        if (error) {
          console.error("[Dashboard] Error fetching bookings:", error)

          // Handle rate limiting with exponential backoff
          if (error.message && (error.message.includes("Too Many") || error.message.includes("429"))) {
            if (retryCount.current < MAX_RETRIES) {
              retryCount.current++
              const delay = RETRY_DELAY * Math.pow(2, retryCount.current - 1)
              console.log(
                `[Dashboard] Rate limited. Retrying in ${delay}ms (Attempt ${retryCount.current}/${MAX_RETRIES})`
              )

              setState(prev => ({ 
                ...prev, 
                fetchError: `Rate limited by Supabase. Retrying in ${delay / 1000} seconds...` 
              }))

              setTimeout(() => {
                fetchInProgress.current = false
                fetchBookings()
              }, delay)
              return
            } else {
              setState(prev => ({ 
                ...prev, 
                fetchError: "Too many requests. Please wait a moment before trying again.",
                bookings: []
              }))
            }
          } else {
            setState(prev => ({ 
              ...prev, 
              fetchError: `Failed to load bookings: ${error.message}`,
              bookings: []
            }))
          }
        } else {
          console.log(`[Dashboard] Fetched ${data?.length || 0} bookings:`, data)

          const processedData =
            data?.map((booking) => ({
              ...booking,
              _start_date: parseISO(booking.start_time),
              _end_date: parseISO(booking.end_time),
            })) || []

          setState(prev => ({
            ...prev,
            bookings: processedData,
            lastRefreshTime: new Date()
          }))
          retryCount.current = 0
        }
      } catch (error) {
        console.error("[Dashboard] Exception fetching bookings:", error)
        setState(prev => ({
          ...prev,
          fetchError: `Error: ${error instanceof Error ? error.message : String(error)}`,
          bookings: []
        }))
      } finally {
        setState(prev => ({ ...prev, isLoading: false }))
        setTimeout(() => {
          fetchInProgress.current = false
        }, 500)
      }
    },
    [state.currentDate, state.selectedDate, state.selectedRoom, state.view, state.showAllRooms, supabase]
  )

  // Fetch bookings when dependencies change
  useEffect(() => {
    console.log("[Dashboard] Dependencies changed, fetching bookings...")
    fetchBookings()

    return () => {
      fetchInProgress.current = false
    }
  }, [fetchBookings])

  // Update selected date bookings
  useEffect(() => {
    console.log(`[Dashboard] Updating selected date bookings for ${format(state.selectedDate, "yyyy-MM-dd")}`)
    
    const dateBookings = state.bookings.filter((booking) => {
      const bookingDate = parseISO(booking.start_time)
      return isSameDay(bookingDate, state.selectedDate)
    })

    console.log(`[Dashboard] Found ${dateBookings.length} bookings for selected date`)
    setState(prev => ({ ...prev, selectedDateBookings: dateBookings }))
  }, [state.selectedDate, state.bookings])

  // Action handlers
  const actions: DashboardActions = {
    handleRoomChange: (room: Room) => {
      console.log(`[Dashboard] Room changed to: ${room.name}`)
      setState(prev => ({ ...prev, selectedRoom: room, showAllRooms: false }))
    },

    handleDateSelect: (date: Date) => {
      console.log(`[Dashboard] Date selected: ${format(date, "yyyy-MM-dd")}`)
      setState(prev => ({
        ...prev,
        selectedDate: date,
        currentDate: prev.view === "month" ? date : prev.currentDate
      }))
    },

    handleViewChange: (newView: ViewType) => {
      console.log(`[Dashboard] View changed to: ${newView}`)
      setState(prev => ({ ...prev, view: newView, currentDate: prev.selectedDate }))
    },

    handleBookingCreated: (newBooking: Booking) => {
      console.log(`[Dashboard] Booking created: ${newBooking.id} - ${newBooking.title}`)
      
      fetchInProgress.current = false
      retryCount.current = 0

      setTimeout(() => {
        fetchBookings(true)
      }, 500)

      setState(prev => ({ ...prev, isBookingFormOpen: false, bookingFormRoom: null }))
    },

    handleBookingDeleted: (bookingId: string) => {
      console.log(`[Dashboard] Booking deleted: ${bookingId}`)
      setState(prev => ({
        ...prev,
        bookings: prev.bookings.filter((booking) => booking.id !== bookingId)
      }))

      setTimeout(() => {
        fetchBookings(true)
      }, 500)
    },

    openBookingForm: (room: Room | null = state.selectedRoom) => {
      console.log(`[Dashboard] Opening booking form for room: ${room?.name || "none"}`)
      setState(prev => ({ ...prev, bookingFormRoom: room, isBookingFormOpen: true }))
    },

    navigatePrevious: () => {
      setState(prev => {
        if (prev.view === "day") {
          return {
            ...prev,
            currentDate: addDays(prev.currentDate, -1),
            selectedDate: addDays(prev.selectedDate, -1)
          }
        } else if (prev.view === "week") {
          return {
            ...prev,
            currentDate: subWeeks(prev.currentDate, 1),
            selectedDate: subWeeks(prev.selectedDate, 1)
          }
        } else {
          return { ...prev, currentDate: subMonths(prev.currentDate, 1) }
        }
      })
    },

    navigateNext: () => {
      setState(prev => {
        if (prev.view === "day") {
          return {
            ...prev,
            currentDate: addDays(prev.currentDate, 1),
            selectedDate: addDays(prev.selectedDate, 1)
          }
        } else if (prev.view === "week") {
          return {
            ...prev,
            currentDate: addWeeks(prev.currentDate, 1),
            selectedDate: addWeeks(prev.selectedDate, 1)
          }
        } else {
          return { ...prev, currentDate: addMonths(prev.currentDate, 1) }
        }
      })
    },

    navigateToday: () => {
      const today = new Date()
      setState(prev => ({ ...prev, currentDate: today, selectedDate: today }))
    },

    fetchBookings,

    setShowAllRooms: (show: boolean) => {
      setState(prev => ({ ...prev, showAllRooms: show }))
    },

    setIsBookingFormOpen: (open: boolean) => {
      setState(prev => ({ ...prev, isBookingFormOpen: open }))
    },

    setBookingFormRoom: (room: Room | null) => {
      setState(prev => ({ ...prev, bookingFormRoom: room }))
    }
  }

  // Manual retry function for errors
  const retryFetch = () => {
    retryCount.current = 0
    fetchInProgress.current = false
    fetchBookings(true)
  }

  return {
    state,
    actions,
    retryFetch
  }
} 