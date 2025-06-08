"use client"

import { useState, useEffect, useRef } from "react"
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from "date-fns"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarIcon, AlertCircle, RefreshCw, Clock } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { getRoomColor } from "@/lib/colors"
import type { Database } from "@/types/supabase"
import { formatTime } from "@/lib/time-utils"

type Room = Database["public"]["Tables"]["rooms"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"]

interface BookingDashboardProps {
  rooms: Room[]
}

export default function BookingDashboard({ rooms }: BookingDashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [selectedRoom, setSelectedRoom] = useState<string>("all")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roomBookingCounts, setRoomBookingCounts] = useState<Record<string, number>>({})
  const [dateBookingCounts, setDateBookingCounts] = useState<Record<string, number>>({})
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const fetchInProgress = useRef(false)
  const retryCount = useRef(0)
  const MAX_RETRIES = 3
  const RETRY_DELAY = 1000 // Start with 1 second delay

  // Get Supabase client
  const supabase = getSupabaseClient()

  // Function to handle day selection
  const handleDaySelect = (day: Date) => {
    setSelectedDay(day)
  }

  // Fetch bookings for the selected month
  useEffect(() => {
    const fetchBookings = async () => {
      if (fetchInProgress.current) return

      setIsLoading(true)
      fetchInProgress.current = true

      const monthStart = startOfMonth(selectedMonth)
      const monthEnd = endOfMonth(selectedMonth)

      try {
        console.log(`[BookingDashboard] Fetching bookings for ${format(selectedMonth, "MMMM yyyy")}`)

        let query = supabase
          .from("bookings")
          .select("*")
          .gte("start_time", monthStart.toISOString())
          .lte("start_time", monthEnd.toISOString())
          .order("start_time")

        // Filter by room if a specific room is selected
        if (selectedRoom !== "all") {
          query = query.eq("room_id", selectedRoom)
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          // Check if it's a rate limit error
          if (fetchError.message && (fetchError.message.includes("Too Many") || fetchError.message.includes("429"))) {
            if (retryCount.current < MAX_RETRIES) {
              retryCount.current++
              const delay = RETRY_DELAY * Math.pow(2, retryCount.current - 1) // Exponential backoff
              console.log(`Rate limited. Retrying in ${delay}ms (Attempt ${retryCount.current}/${MAX_RETRIES})`)

              // Retry after delay with exponential backoff
              setTimeout(() => {
                fetchInProgress.current = false
                fetchBookings()
              }, delay)
              return
            } else {
              setError("Too many requests. Please wait a moment before trying again.")
            }
          } else {
            setError(`Failed to load bookings: ${fetchError.message}`)
          }
          setBookings([])
        } else {
          console.log(`[BookingDashboard] Fetched ${data?.length || 0} bookings`)
          setBookings(data || [])

          // Calculate booking counts per room
          const roomCounts: Record<string, number> = {}
          // Calculate booking counts per date
          const dateCounts: Record<string, number> = {}

          data?.forEach((booking) => {
            // Count by room
            if (roomCounts[booking.room_id]) {
              roomCounts[booking.room_id]++
            } else {
              roomCounts[booking.room_id] = 1
            }

            // Count by date
            const dateKey = format(parseISO(booking.start_time), "yyyy-MM-dd")
            if (dateCounts[dateKey]) {
              dateCounts[dateKey]++
            } else {
              dateCounts[dateKey] = 1
            }
          })

          setRoomBookingCounts(roomCounts)
          setDateBookingCounts(dateCounts)
          retryCount.current = 0 // Reset retry count on success
        }
      } catch (error) {
        console.error("[BookingDashboard] Exception fetching bookings:", error)
        setError(`Error: ${error instanceof Error ? error.message : String(error)}`)
        setBookings([])
      } finally {
        setIsLoading(false)
        // Allow next fetch after a short delay
        setTimeout(() => {
          fetchInProgress.current = false
        }, 500)
      }
    }

    fetchBookings()
  }, [selectedMonth, selectedRoom, supabase])

  // Navigation functions
  const previousMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const currentMonth = () => {
    setSelectedMonth(new Date())
  }

  // Generate calendar days for the month
  const monthStart = startOfMonth(selectedMonth)
  const monthEnd = endOfMonth(selectedMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get room name by ID
  const getRoomName = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId)
    return room ? room.name : "Unknown Room"
  }

  // Get booking count for a specific day
  const getBookingCountForDay = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd")
    return dateBookingCounts[dateKey] || 0
  }

  // Get color intensity based on booking count
  const getColorIntensity = (count: number) => {
    if (count === 0) return "bg-muted/20"
    if (count <= 2) return "bg-primary/20"
    if (count <= 5) return "bg-primary/40"
    return "bg-primary/70 text-primary-foreground"
  }

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  return (
    <Card className="shadow-md border-primary/10">
      <CardHeader className="bg-muted/50 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Oasis Village Event Dashboard</CardTitle>
            <CardDescription>Overview of room bookings</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={currentMonth}>
              {format(new Date(), "MMMM")}
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold">{format(selectedMonth, "MMMM yyyy")}</h2>
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a room" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <div className="grid grid-cols-7 gap-2">
              {Array(31)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Room booking summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedRoom === "all" &&
                rooms.map((room) => {
                  const color = getRoomColor(room.id, rooms)
                  return (
                    <Card
                      key={room.id}
                      className={`border ${color.border} cursor-pointer hover:shadow-md transition-all ${
                        selectedRoom === room.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedRoom(room.id)}
                    >
                      <CardContent className={`p-4 ${color.light}`}>
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">{room.name}</h3>
                          <div
                            className={`text-lg font-bold px-3 py-1 rounded-full ${
                              roomBookingCounts[room.id] ? `${color.bg} ${color.text}` : "bg-muted/30"
                            }`}
                          >
                            {roomBookingCounts[room.id] || 0}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {roomBookingCounts[room.id]
                            ? `${roomBookingCounts[room.id]} bookings this month`
                            : "No bookings this month"}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}

              {selectedRoom !== "all" && (
                <Card className={`border ${getRoomColor(selectedRoom, rooms).border} col-span-full`}>
                  <CardContent className={`p-4 ${getRoomColor(selectedRoom, rooms).light}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{getRoomName(selectedRoom)}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Total bookings for {format(selectedMonth, "MMMM yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-lg font-bold px-3 py-1 rounded-full ${getRoomColor(selectedRoom, rooms).bg} ${getRoomColor(selectedRoom, rooms).text}`}
                        >
                          {Object.values(dateBookingCounts).reduce((sum, count) => sum + count, 0) || 0}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRoom("all")} className="ml-2">
                          Back to all rooms
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Calendar view */}
            <div>
              <h3 className="font-medium mb-3 flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
                Monthly Calendar View
              </h3>

              <div className="grid grid-cols-7 text-center mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {/* Add empty cells for days before the start of the month */}
                {Array((monthStart.getDay() + 6) % 7)
                  .fill(null)
                  .map((_, index) => (
                    <div key={`empty-start-${index}`} className="h-24 rounded-md"></div>
                  ))}

                {/* Calendar days */}
                {calendarDays.map((day) => {
                  const dayBookings = bookings.filter(
                    (booking) => format(parseISO(booking.start_time), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
                  )
                  const bookingCount = dayBookings.length
                  const isCurrentDay = isSameDay(day, new Date())

                  // Get the room color for the first booking (if any)
                  let dayColor = "bg-muted/20"
                  let textColor = ""

                  if (bookingCount > 0) {
                    if (selectedRoom !== "all") {
                      const color = getRoomColor(selectedRoom, rooms)
                      dayColor = bookingCount <= 2 ? color.light : color.bg
                      textColor = bookingCount > 5 ? color.text : ""
                    } else {
                      dayColor = getColorIntensity(bookingCount)
                    }
                  }

                  return (
                    <div
                      key={day.toString()}
                      className={`h-24 rounded-md border ${
                        isCurrentDay ? "bg-primary/5 border-primary/20" : "bg-card"
                      } ${isSameDay(day, selectedDay || new Date()) ? "ring-2 ring-primary ring-opacity-50" : ""} flex flex-col p-2 cursor-pointer hover:bg-muted/10 transition-colors`}
                      onClick={() => handleDaySelect(day)}
                    >
                      <div className="text-sm font-medium">{format(day, "d")}</div>
                      {bookingCount > 0 && (
                        <div className="mt-auto text-center">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-background/80">
                            {bookingCount} booking{bookingCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add empty cells for days after the end of the month */}
                {Array(7 - ((monthEnd.getDay() + 6) % 7 || 7))
                  .fill(null)
                  .map((_, index) => (
                    <div key={`empty-end-${index}`} className="h-20 rounded-md"></div>
                  ))}
              </div>
            </div>

            {/* Selected day activity */}
            {selectedDay && (
              <div className="mt-6 border rounded-lg p-4 bg-card">
                <h3 className="font-medium text-lg mb-3 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-primary" />
                  Activity for {format(selectedDay, "MMMM d, yyyy")}
                  {isToday(selectedDay) && (
                    <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Today</span>
                  )}
                </h3>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getBookingCountForDay(selectedDay) > 0 ? (
                      bookings
                        .filter((booking) => isSameDay(parseISO(booking.start_time), selectedDay))
                        .map((booking) => {
                          const roomColor = getRoomColor(booking.room_id, rooms)
                          return (
                            <div
                              key={booking.id}
                              className={`p-3 border ${roomColor.border} rounded-md ${roomColor.light}`}
                            >
                              <div className="font-medium">{getRoomName(booking.room_id)}</div>
                              <div className="text-sm text-muted-foreground flex items-center mt-1">
                                <Clock className="h-3 w-3 mr-1.5 text-primary/70" />
                                <span>
                                  {formatTime(parseISO(booking.start_time))} - {formatTime(parseISO(booking.end_time))}
                                </span>
                              </div>
                              {booking.title && <div className="text-sm mt-1">{booking.title}</div>}
                            </div>
                          )
                        })
                    ) : (
                      <div className="text-center py-6 bg-muted/20 rounded-md border border-dashed">
                        <p className="text-muted-foreground">No activity for this day</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recent bookings list */}
            {bookings.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Recent Bookings</h3>
                <div className="space-y-2">
                  {bookings.slice(0, 5).map((booking) => {
                    const color = getRoomColor(booking.room_id, rooms)
                    return (
                      <div
                        key={booking.id}
                        className={`p-3 border rounded-md ${color.light} ${color.border} flex justify-between items-center`}
                      >
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            {booking.title}
                            {booking.is_recurring && <RefreshCw className="h-3 w-3" />}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseISO(booking.start_time), "MMM d, yyyy • ")}
                            {formatTime(parseISO(booking.start_time))} - {formatTime(parseISO(booking.end_time))}
                          </div>
                        </div>
                        <div className={`text-sm ${color.bg} ${color.text} px-2 py-1 rounded`}>
                          {getRoomName(booking.room_id)}
                        </div>
                      </div>
                    )
                  })}
                  {bookings.length > 5 && (
                    <div className="text-center text-sm text-muted-foreground py-2">
                      + {bookings.length - 5} more bookings this month
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
