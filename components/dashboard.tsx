"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  parseISO,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isToday,
} from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, AlertCircle, RefreshCw, Palette } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import BookingForm from "@/components/booking-form"
import BookingList from "@/components/booking-list"
import RoomSelector from "@/components/room-selector"
import SupabaseTest from "@/components/supabase-test"
import DebugPanel from "@/components/debug-panel"
import { getRoomColor } from "@/lib/colors"
import type { Database } from "@/types/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useMediaQuery } from "@/hooks/use-media-query"
import { formatTime } from "@/lib/time-utils"

type Room = Database["public"]["Tables"]["rooms"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type ViewType = "day" | "week" | "month"

interface DashboardProps {
  rooms: Room[]
  userId: string
}

export default function Dashboard({ rooms, userId }: DashboardProps) {
  // Add diagnostic logging
  useEffect(() => {
    console.log("[Dashboard] Component mounted")
    return () => console.log("[Dashboard] Component unmounted")
  }, [])

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<ViewType>("month")
  const [selectedDateBookings, setSelectedDateBookings] = useState<Booking[]>([])
  const [bookingFormRoom, setBookingFormRoom] = useState<Room | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showAllRooms, setShowAllRooms] = useState(true)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())

  // Get search params to check for view=all
  const searchParams = useSearchParams()

  // Update showAllRooms based on URL parameter
  useEffect(() => {
    const viewParam = searchParams.get("view")
    if (viewParam === "all") {
      setShowAllRooms(true)
      setSelectedRoom(null)
    } else if (!viewParam) {
      // Default to showing all rooms if no specific view parameter
      setShowAllRooms(true)
      setSelectedRoom(null)
    }
  }, [searchParams])

  // Check if we're on mobile
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Get Supabase client once during component initialization
  const supabase = getSupabaseClient()

  // Inside the Dashboard component, add this before the useEffect for fetchBookings
  const fetchInProgress = useRef(false)
  const retryCount = useRef(0)
  const MAX_RETRIES = 3
  const RETRY_DELAY = 1000 // Start with 1 second delay

  // Create a memoized fetchBookings function
  const fetchBookings = useCallback(
    async (forceRefresh = false) => {
      if (!selectedRoom && !showAllRooms && !forceRefresh) return
      if (fetchInProgress.current && !forceRefresh) return

      console.log(`[Dashboard] Starting fetchBookings (force: ${forceRefresh})`)
      setIsLoading(true)
      setFetchError(null)
      fetchInProgress.current = true

      let startDate, endDate

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

      try {
        console.log(
          `[Dashboard] Fetching bookings for ${view} view from ${startDate.toISOString()} to ${endDate.toISOString()}`,
        )

        let query = supabase
          .from("bookings")
          .select("*")
          .gte("start_time", startDate.toISOString())
          .lte("end_time", endDate.toISOString())
          .order("start_time")

        // Filter by room if a specific room is selected and not showing all rooms
        if (selectedRoom && !showAllRooms) {
          console.log(`[Dashboard] Filtering by room: ${selectedRoom.id} (${selectedRoom.name})`)
          query = query.eq("room_id", selectedRoom.id)
        }

        const { data, error } = await query

        if (error) {
          console.error("[Dashboard] Error fetching bookings:", error)

          // Check if it's a rate limit error
          if (error.message && (error.message.includes("Too Many") || error.message.includes("429"))) {
            if (retryCount.current < MAX_RETRIES) {
              retryCount.current++
              const delay = RETRY_DELAY * Math.pow(2, retryCount.current - 1) // Exponential backoff
              console.log(
                `[Dashboard] Rate limited. Retrying in ${delay}ms (Attempt ${retryCount.current}/${MAX_RETRIES})`,
              )

              setFetchError(`Rate limited by Supabase. Retrying in ${delay / 1000} seconds...`)

              // Retry after delay with exponential backoff
              setTimeout(() => {
                fetchInProgress.current = false
                fetchBookings()
              }, delay)
              return
            } else {
              setFetchError(`Too many requests. Please wait a moment before trying again.`)
            }
          } else {
            setFetchError(`Failed to load bookings: ${error.message}`)
          }
          setBookings([])
        } else {
          console.log(`[Dashboard] Fetched ${data?.length || 0} bookings:`, data)

          // Process the data to ensure dates are properly parsed
          const processedData =
            data?.map((booking) => ({
              ...booking,
              // Ensure these are proper Date objects when used in the component
              _start_date: parseISO(booking.start_time),
              _end_date: parseISO(booking.end_time),
            })) || []

          setBookings(processedData)
          setLastRefreshTime(new Date())
          retryCount.current = 0 // Reset retry count on success
        }
      } catch (error) {
        console.error("[Dashboard] Exception fetching bookings:", error)
        setFetchError(`Error: ${error instanceof Error ? error.message : String(error)}`)
        setBookings([])
      } finally {
        setIsLoading(false)
        // Allow next fetch after a short delay to prevent rapid consecutive requests
        setTimeout(() => {
          fetchInProgress.current = false
        }, 500)
      }
    },
    [currentDate, selectedDate, selectedRoom, view, supabase, showAllRooms],
  )

  // Update the useEffect to use the memoized function
  useEffect(() => {
    console.log("[Dashboard] Dependencies changed, fetching bookings...")
    fetchBookings()

    // Cleanup function
    return () => {
      fetchInProgress.current = false
    }
  }, [fetchBookings])

  // Update selected date bookings when date or bookings change
  useEffect(() => {
    console.log(`[Dashboard] Updating selected date bookings for ${format(selectedDate, "yyyy-MM-dd")}`)
    console.log(`[Dashboard] Total bookings available: ${bookings.length}`)

    const dateBookings = bookings.filter((booking) => {
      const bookingDate = parseISO(booking.start_time)
      const isSame = isSameDay(bookingDate, selectedDate)
      console.log(
        `[Dashboard] Booking ${booking.id} date: ${format(bookingDate, "yyyy-MM-dd")} matches selected date: ${isSame}`,
      )
      return isSame
    })

    console.log(`[Dashboard] Found ${dateBookings.length} bookings for selected date`)
    setSelectedDateBookings(dateBookings)
  }, [selectedDate, bookings])

  const handleRoomChange = (room: Room) => {
    console.log(`[Dashboard] Room changed to: ${room.name}`)
    setSelectedRoom(room)
    setShowAllRooms(false)
  }

  const handleDateSelect = (date: Date) => {
    console.log(`[Dashboard] Date selected: ${format(date, "yyyy-MM-dd")}`)
    setSelectedDate(date)
    if (view === "month") {
      setCurrentDate(date)
    }
  }

  const handleViewChange = (newView: ViewType) => {
    console.log(`[Dashboard] View changed to: ${newView}`)
    setView(newView)
    // Reset current date to selected date when changing views
    setCurrentDate(selectedDate)
  }

  const handleBookingCreated = (newBooking: Booking) => {
    console.log(`[Dashboard] Booking created: ${newBooking.id} - ${newBooking.title}`)
    console.log(`[Dashboard] Booking start time: ${newBooking.start_time}`)
    console.log(`[Dashboard] Selected date: ${format(selectedDate, "yyyy-MM-dd")}`)

    // Force a complete refresh of the bookings data
    fetchInProgress.current = false
    retryCount.current = 0

    // Add a small delay to ensure the database has time to update
    setTimeout(() => {
      fetchBookings(true)
    }, 500)

    setIsBookingFormOpen(false)
    setBookingFormRoom(null) // Reset booking form room after creation
  }

  const handleBookingDeleted = (bookingId: string) => {
    console.log(`[Dashboard] Booking deleted: ${bookingId}`)
    setBookings(bookings.filter((booking) => booking.id !== bookingId))

    // Also force a refresh after deletion
    setTimeout(() => {
      fetchBookings(true)
    }, 500)
  }

  // Function to open booking form with current selections
  const openBookingForm = (room: Room | null = selectedRoom) => {
    console.log(`[Dashboard] Opening booking form for room: ${room?.name || "none"}`)
    setBookingFormRoom(room)
    setIsBookingFormOpen(true)
  }

  // Navigation functions
  const navigatePrevious = () => {
    if (view === "day") {
      setCurrentDate((prev) => addDays(prev, -1))
      setSelectedDate((prev) => addDays(prev, -1))
    } else if (view === "week") {
      setCurrentDate((prev) => subWeeks(prev, 1))
      setSelectedDate((prev) => subWeeks(prev, 1))
    } else {
      setCurrentDate((prev) => subMonths(prev, 1))
    }
  }

  const navigateNext = () => {
    if (view === "day") {
      setCurrentDate((prev) => addDays(prev, 1))
      setSelectedDate((prev) => addDays(prev, 1))
    } else if (view === "week") {
      setCurrentDate((prev) => addWeeks(prev, 1))
      setSelectedDate((prev) => addWeeks(prev, 1))
    } else {
      setCurrentDate((prev) => addMonths(prev, 1))
    }
  }

  const navigateToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  // Generate days for the month view
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDateMonth = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDateMonth = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calendarDays = eachDayOfInterval({ start: startDateMonth, end: endDateMonth })

  // Create a 2D array for weeks in month view
  const calendarWeeks = []
  let week = []

  calendarDays.forEach((day) => {
    week.push(day)
    if (week.length === 7) {
      calendarWeeks.push(week)
      week = []
    }
  })

  // Generate days for week view
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  })

  // Helper functions
  const getBookingsForDay = (day: Date) => {
    const dayBookings = bookings.filter((booking) => {
      const bookingDate = parseISO(booking.start_time)
      return isSameDay(bookingDate, day)
    })
    return dayBookings
  }

  // Format title based on view
  const getViewTitle = () => {
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

  // Add this check at the beginning
  if (!rooms || rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Loading Rooms</h2>
          <p className="text-muted-foreground mb-6">Please wait while we load your rooms...</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <SupabaseTest />
        <DebugPanel />

        {fetchError && (
          <Alert variant={fetchError.includes("Retrying") ? "default" : "destructive"} className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{fetchError.includes("Retrying") ? "Loading Data" : "Error Loading Data"}</AlertTitle>
            <AlertDescription>
              {fetchError}
              {fetchError.includes("Too many requests") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    retryCount.current = 0
                    fetchInProgress.current = false
                    fetchBookings(true)
                  }}
                >
                  Try Again
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Oasis Village Event Room Booking System</h1>
              <p className="text-muted-foreground mt-1">
                {showAllRooms
                  ? "Viewing all rooms"
                  : selectedRoom
                    ? `Currently viewing: ${selectedRoom.name}`
                    : "Select a room to view bookings"}
              </p>
              <div className="text-xs text-muted-foreground mt-1">
                Last updated: {format(lastRefreshTime, "h:mm:ss a")}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 ml-2 text-xs"
                  onClick={() => fetchBookings(true)}
                  disabled={isLoading}
                >
                  {isLoading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={navigateToday} className="shadow-sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Today
              </Button>
              <Button onClick={() => openBookingForm()} className="shadow-sm">
                <Plus className="mr-2 h-4 w-4" /> New Booking
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card className="shadow-md border-primary/10 h-full">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle>Rooms</CardTitle>
                <CardDescription>Select a room to view bookings</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-3">
                  <Button
                    variant={showAllRooms ? "default" : "outline"}
                    className="w-full justify-start mb-3"
                    onClick={() => setShowAllRooms(true)}
                  >
                    <Palette className="mr-2 h-4 w-4 text-primary" />
                    <span>View All Rooms</span>
                  </Button>
                </div>
                <RoomSelector
                  rooms={rooms}
                  selectedRoom={selectedRoom}
                  onRoomChange={handleRoomChange}
                  showColors={true}
                />
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3 space-y-6">
            <Card className="shadow-md border-primary/10">
              <CardHeader className="bg-muted/50 border-b pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>{showAllRooms ? "All Rooms" : selectedRoom?.name || "Select a room"}</CardTitle>
                    <CardDescription className="mt-1">
                      {showAllRooms ? "Viewing bookings across all rooms" : selectedRoom?.description}
                    </CardDescription>
                  </div>
                  <Tabs value={view} onValueChange={(v) => handleViewChange(v as ViewType)} className="mr-0 sm:mr-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="day">Day</TabsTrigger>
                      <TabsTrigger value="week">Week</TabsTrigger>
                      <TabsTrigger value="month">Month</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-6 bg-muted/30 p-3 rounded-md">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={navigatePrevious} className="shadow-sm">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Previous {view}</TooltipContent>
                  </Tooltip>
                  <div className="font-medium text-lg">{getViewTitle()}</div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={navigateNext} className="shadow-sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Next {view}</TooltipContent>
                  </Tooltip>
                </div>

                {/* Day View */}
                {view === "day" && (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-border">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                      <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                      {format(currentDate, "EEEE, MMMM d")}
                      {isToday(currentDate) && (
                        <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Today</span>
                      )}
                    </h2>
                    <BookingList
                      bookings={getBookingsForDay(currentDate)}
                      isLoading={isLoading}
                      userId={userId}
                      onBookingDeleted={handleBookingDeleted}
                      rooms={rooms}
                    />
                  </div>
                )}

                {/* Week View */}
                {view === "week" && (
                  <div className="overflow-x-auto pb-4">
                    <div
                      className={`grid grid-cols-7 gap-2 md:gap-4 ${isMobile ? "min-w-[700px]" : "min-w-[800px]"} pt-2`}
                    >
                      {weekDays.map((day) => {
                        const dayBookings = getBookingsForDay(day)
                        const isCurrentDay = isToday(day)
                        const isSelectedDay = isSameDay(day, selectedDate)

                        return (
                          <div
                            key={day.toString()}
                            className={`space-y-2 pt-1 rounded-lg transition-all ${
                              isSelectedDay ? "ring-2 ring-primary ring-opacity-50" : ""
                            }`}
                            onClick={() => handleDateSelect(day)}
                          >
                            <div
                              className={`text-center p-2 md:p-3 mt-1 rounded-md shadow-sm transition-colors
                                ${
                                  isCurrentDay
                                    ? "bg-primary text-primary-foreground font-bold"
                                    : "bg-muted/50 hover:bg-muted"
                                }
                              `}
                            >
                              <div className="text-xs md:text-sm font-medium">
                                {format(day, isMobile ? "EEE" : "EEEE")}
                              </div>
                              <div className="text-base md:text-lg">{format(day, "d")}</div>
                              <div className="text-xs opacity-80">{format(day, "MMM")}</div>
                            </div>
                            <div className="space-y-2 mt-2 px-1">
                              {dayBookings.length > 0 ? (
                                dayBookings.map((booking) => {
                                  const color = getRoomColor(booking.room_id, rooms)

                                  return (
                                    <div
                                      key={booking.id}
                                      className={`p-1.5 md:p-2 ${color.bg} ${color.hover} ${color.border} rounded-md border shadow-sm transition-colors`}
                                      title={`${booking.title} (${formatTime(parseISO(booking.start_time))} - ${formatTime(parseISO(booking.end_time))})`}
                                    >
                                      <div className="font-medium truncate text-xs md:text-sm">{booking.title}</div>
                                      <div className="text-xs text-muted-foreground flex items-center mt-1">
                                        {booking.is_recurring ? (
                                          <RefreshCw className="h-3 w-3 mr-1 inline shrink-0" />
                                        ) : (
                                          <Clock className="h-3 w-3 mr-1 inline shrink-0" />
                                        )}
                                        <span className="truncate">{formatTime(parseISO(booking.start_time))}</span>
                                      </div>
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="text-center py-4 md:py-6 text-xs md:text-sm text-muted-foreground bg-muted/20 rounded-md border border-dashed border-muted">
                                  No bookings
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Month View - Mobile Optimized */}
                {view === "month" && (
                  <div className="rounded-lg border border-border overflow-hidden shadow-sm">
                    {/* Day headers - Abbreviated on mobile */}
                    <div className="grid grid-cols-7 bg-muted">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                        <div key={day} className="py-2 text-center font-medium text-xs md:text-sm">
                          {isMobile ? day.substring(0, 1) : day.substring(0, 3)}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="bg-card">
                      {calendarWeeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="grid grid-cols-7 border-t border-border">
                          {week.map((day) => {
                            const dayBookings = getBookingsForDay(day)
                            const isCurrentMonth = isSameMonth(day, currentDate)
                            const isCurrentDay = isToday(day)
                            const isSelectedDay = isSameDay(day, selectedDate)

                            return (
                              <div
                                key={day.toString()}
                                className={`min-h-[80px] md:min-h-[120px] p-1 border-r border-border last:border-r-0 relative cursor-pointer transition-colors
                                  ${!isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""}
                                  ${isCurrentDay ? "bg-primary/5" : ""}
                                  ${isSelectedDay ? "ring-2 ring-primary ring-inset" : ""}
                                  hover:bg-muted/10
                                `}
                                onClick={() => handleDateSelect(day)}
                              >
                                <div className="flex justify-between items-center p-1">
                                  <span
                                    className={`text-xs md:text-sm inline-flex items-center justify-center rounded-full w-6 h-6 md:w-7 md:h-7
                                    ${isCurrentDay ? "bg-primary text-primary-foreground font-bold" : ""}
                                  `}
                                  >
                                    {format(day, "d")}
                                  </span>
                                  {isCurrentMonth && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 md:h-6 md:w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedDate(day)
                                        openBookingForm()
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>

                                {/* Mobile-optimized booking display */}
                                <div className="space-y-1 mt-1 max-h-[60px] md:max-h-[80px] overflow-y-auto px-0.5 md:px-1">
                                  {dayBookings.slice(0, isMobile ? 2 : 3).map((booking) => {
                                    const color = getRoomColor(booking.room_id, rooms)

                                    return (
                                      <div
                                        key={booking.id}
                                        className={`text-xs p-1 md:p-1.5 ${color.bg} ${color.hover} ${color.border} rounded truncate border shadow-sm transition-colors`}
                                        title={`${booking.title} (${formatTime(parseISO(booking.start_time))} - ${formatTime(parseISO(booking.end_time))})`}
                                      >
                                        <div className="flex items-center">
                                          {booking.is_recurring ? (
                                            <RefreshCw className="h-2 w-2 md:h-2.5 md:w-2.5 mr-0.5 md:mr-1 shrink-0" />
                                          ) : (
                                            <Clock className="h-2 w-2 md:h-2.5 md:w-2.5 mr-0.5 md:mr-1 text-primary/70 shrink-0" />
                                          )}
                                          <span className="text-[10px] md:text-xs">
                                            {formatTime(parseISO(booking.start_time))}
                                          </span>
                                        </div>
                                        <div className="font-medium mt-0.5 truncate text-[10px] md:text-xs">
                                          {booking.title}
                                        </div>
                                      </div>
                                    )
                                  })}
                                  {dayBookings.length > (isMobile ? 2 : 3) && (
                                    <div className="text-[10px] md:text-xs text-center py-0.5 md:py-1 text-primary font-medium bg-primary/5 rounded-md">
                                      +{dayBookings.length - (isMobile ? 2 : 3)} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected day bookings - only show in week and month views */}
            {view !== "day" && (
              <Card className="shadow-md border-primary/10">
                <CardHeader className="bg-muted/50 border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center text-base md:text-lg">
                      <CalendarIcon className="mr-2 h-4 w-4 md:h-5 md:w-5 text-primary" />
                      Bookings for {format(selectedDate, "MMMM d, yyyy")}
                      {isToday(selectedDate) && (
                        <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Today</span>
                      )}
                    </CardTitle>
                    <Button size="sm" onClick={() => openBookingForm()} className="shadow-sm gap-1" variant="outline">
                      <Plus className="h-3.5 w-3.5" /> Book
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <BookingList
                    bookings={selectedDateBookings}
                    isLoading={isLoading}
                    userId={userId}
                    onBookingDeleted={handleBookingDeleted}
                    rooms={rooms}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <BookingForm
          isOpen={isBookingFormOpen}
          onClose={() => {
            setIsBookingFormOpen(false)
            setBookingFormRoom(null)
          }}
          rooms={rooms}
          selectedRoom={bookingFormRoom || selectedRoom}
          userId={userId || uuidv4()}
          selectedDate={selectedDate}
          onBookingCreated={handleBookingCreated}
        />
      </div>
    </TooltipProvider>
  )
}
