"use client"

import { useState, useEffect, useMemo } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek,
  isWeekend,
  isSaturday,
  addDays,
  subWeeks,
  addWeeks,
} from "date-fns"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  HardHat,
  DoorOpen,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Database } from "@/types/supabase"
import WeekendAssignmentModal from "./weekend-assignment-modal"
import { formatTime } from "@/lib/time-utils"
import { toast } from "sonner"

type Room = Database["public"]["Tables"]["rooms"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type ContractorVisit = Database["public"]["Tables"]["contractor_visits"]["Row"] & {
  contractors: { name: string; type: string } | null
}
type GuestVisit = Database["public"]["Tables"]["guest_visits"]["Row"] & {
  partners: { name: string } | null
}
type Caretaker = Database["public"]["Tables"]["caretakers"]["Row"]
type WeekendAssignment = Database["public"]["Tables"]["weekend_assignments"]["Row"] & {
  caretakers: { name: string; color: string } | null
}

// Define a unified event type that can represent any of our event types
type ConsolidatedEvent = {
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
  entityId: string // ID of the related entity (room, contractor, partner, or other event)
  entityName: string // Name of the related entity
  isRecurring?: boolean // Add this field
  roomName?: string | null // Add room name
  bookedBy?: string | null // Add who booked it
}

interface FacilityCalendarProps {
  rooms: Room[]
  userId: string
}

export default function FacilityCalendar({ rooms, userId }: FacilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Event visibility filters
  const [showRoomBookings, setShowRoomBookings] = useState(true)
  const [showContractorVisits, setShowContractorVisits] = useState(true)
  const [showPartnerVisits, setShowPartnerVisits] = useState(true)
  const [showRecurringEvents, setShowRecurringEvents] = useState(true)

  // Data states
  const [roomBookings, setRoomBookings] = useState<Booking[]>([])
  const [contractorVisits, setContractorVisits] = useState<ContractorVisit[]>([])
  const [partnerVisits, setPartnerVisits] = useState<GuestVisit[]>([])
  const [contractors, setContractors] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])

  // Consolidated events
  const [events, setEvents] = useState<ConsolidatedEvent[]>([])
  const [selectedEvents, setSelectedEvents] = useState<ConsolidatedEvent[]>([])

  // Filter states
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Caretaker states
  const [caretakers, setCaretakers] = useState<Caretaker[]>([])
  const [weekendAssignments, setWeekendAssignments] = useState<WeekendAssignment[]>([])
  const [isWeekendModalOpen, setIsWeekendModalOpen] = useState(false)
  const [selectedWeekendDate, setSelectedWeekendDate] = useState<Date>(new Date())

  // Get Supabase client
  const supabase = getSupabaseClient()

  // Fetch all data for the current month
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)

      // Extend the range to include the full weeks at start and end
      const viewStart = startOfWeek(monthStart, { weekStartsOn: 1 })
      const viewEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

      try {
        // Fetch room bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .gte("start_time", viewStart.toISOString())
          .lte("end_time", viewEnd.toISOString())
          .order("start_time")

        if (bookingsError) {
          console.error("Error fetching bookings:", bookingsError)
          setError(`Failed to load bookings: ${bookingsError.message}`)
          toast.error("Failed to load bookings", {
            description: bookingsError.message,
          })
        } else {
          console.log("[FacilityCalendar] Fetched room bookings:", bookingsData?.length || 0)
          setRoomBookings(bookingsData || [])
        }

        // Fetch contractor visits - use a wider date range to ensure we catch all visits
        const { data: contractorData, error: contractorError } = await supabase
          .from("contractor_visits")
          .select("*, contractors(name, type)")
          .gte("visit_date", viewStart.toISOString().split("T")[0])
          .lte("visit_date", viewEnd.toISOString().split("T")[0])
          .order("visit_date")

        if (contractorError) {
          console.error("Error fetching contractor visits:", contractorError)
          setError(`Failed to load contractor visits: ${contractorError.message}`)
          toast.error("Failed to load contractor visits", {
            description: contractorError.message,
          })
        } else {
          console.log("[FacilityCalendar] Fetched contractor visits:", contractorData?.length || 0)
          setContractorVisits(contractorData || [])
        }

        // Fetch partner visits - use a wider date range to ensure we catch all visits
        const { data: partnerData, error: partnerError } = await supabase
          .from("guest_visits")
          .select("*, partners(name)")
          .gte("visit_date", viewStart.toISOString().split("T")[0])
          .lte("visit_date", viewEnd.toISOString().split("T")[0])
          .order("visit_date")

        if (partnerError) {
          console.error("Error fetching partner visits:", partnerError)
          setError(`Failed to load partner visits: ${partnerError.message}`)
          toast.error("Failed to load partner visits", {
            description: partnerError.message,
          })
        } else {
          console.log("[FacilityCalendar] Fetched partner visits:", partnerData?.length || 0)
          setPartnerVisits(partnerData || [])
        }

        // Fetch contractors for name lookups
        const { data: contractorsData } = await supabase.from("contractors").select("id, name, type").order("name")
        setContractors(contractorsData || [])

        // Fetch partners for name lookups
        const { data: partnersData } = await supabase.from("partners").select("id, name").order("name")
        setPartners(partnersData || [])

        // Fetch caretakers
        const { data: caretakersData } = await supabase.from("caretakers").select("*").order("name")
        setCaretakers(caretakersData || [])

        // Fetch weekend assignments for the current month
        const { data: weekendData } = await supabase
          .from("weekend_assignments")
          .select("*, caretakers(name, color)")
          .gte("weekend_start_date", viewStart.toISOString().split("T")[0])
          .lte("weekend_start_date", viewEnd.toISOString().split("T")[0])
          .order("weekend_start_date")

        setWeekendAssignments(weekendData || [])

        // Set debug info
        setDebugInfo(
          `Loaded: ${bookingsData?.length || 0} room bookings, ${contractorData?.length || 0} contractor visits, ${
            partnerData?.length || 0
          } partner visits`,
        )
      } catch (error) {
        console.error("Error fetching data:", error)
        const errorMessage = `Error: ${error instanceof Error ? error.message : String(error)}`
        setError(errorMessage)
        toast.error("Failed to load calendar data", {
          description: errorMessage,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [currentDate, supabase])

  // Convert all data to consolidated events
  useEffect(() => {
    const allEvents: ConsolidatedEvent[] = []

    // Process room bookings
    if (showRoomBookings) {
      // First, group room bookings by event (same title, time, description, authorizer)
      const roomBookingGroups = new Map<string, Booking[]>()

      roomBookings.forEach((booking) => {
        // Skip room bookings that are associated with contractor/partner visits
        if (
          booking.description?.startsWith("Contractor visit:") ||
          booking.description?.startsWith("Volunteer visit:") ||
          booking.description?.startsWith("Partner guest visit:")
        ) {
          console.log(`[FacilityCalendar] Skipping duplicate room booking: ${booking.title}`)
          return // Skip this booking to avoid duplicates
        }

        // Create a key to group bookings that are for the same event
        const groupKey = `${booking.title}|${booking.start_time}|${booking.end_time}|${booking.description || ""}|${booking.authorizer || ""}`

        if (!roomBookingGroups.has(groupKey)) {
          roomBookingGroups.set(groupKey, [])
        }
        roomBookingGroups.get(groupKey)!.push(booking)
      })

      // Process each group of room bookings
      roomBookingGroups.forEach((bookings, groupKey) => {
        if (bookings.length === 1) {
          // Single room booking - process normally
          const booking = bookings[0]
          const room = rooms.find((r) => r.id === booking.room_id)

          allEvents.push({
            id: `room-${booking.id}`,
            title: booking.title,
            start: parseISO(booking.start_time),
            end: parseISO(booking.end_time),
            type: "room",
            roomId: booking.room_id,
            description: booking.description,
            color: "blue",
            colorClass: "bg-blue-100",
            borderClass: "border-blue-300",
            lightClass: "bg-blue-50",
            entityId: booking.room_id,
            entityName: room?.name || "Unknown Room",
            isRecurring: Boolean(booking.is_recurring),
            roomName: room?.name || null,
            bookedBy: booking.authorizer || null,
          })
        } else {
          // Multiple room bookings for the same event - consolidate into one
          const firstBooking = bookings[0]
          const roomNames = bookings
            .map((booking) => rooms.find((r) => r.id === booking.room_id)?.name)
            .filter(Boolean)
            .join(", ")

          // Create a consolidated event ID using all booking IDs
          const consolidatedId = `room-multi-${bookings.map((b) => b.id).join("-")}`

          allEvents.push({
            id: consolidatedId,
            title: `${firstBooking.title} (${bookings.length} rooms)`,
            start: parseISO(firstBooking.start_time),
            end: parseISO(firstBooking.end_time),
            type: "room",
            roomId: firstBooking.room_id, // Use first room for filtering purposes
            description: firstBooking.description,
            color: "blue",
            colorClass: "bg-blue-100",
            borderClass: "border-blue-300",
            lightClass: "bg-blue-50",
            entityId: consolidatedId,
            entityName: roomNames,
            isRecurring: Boolean(firstBooking.is_recurring),
            roomName: roomNames,
            bookedBy: firstBooking.authorizer || null,
          })
        }
      })
    }

    // Process contractor visits
    if (showContractorVisits) {
      contractorVisits.forEach((visit) => {
        // Get contractor name and type either from the join or from the contractors array
        const contractor = contractors.find((c) => c.id === visit.contractor_id)
        const contractorName = visit.contractors?.name || contractor?.name || "Unknown Contractor"
        const contractorType = contractor?.type || "contractor"
        const isVolunteer = contractorType === "volunteer"

        // Parse the visit date from the database
        const visitDate = parseISO(visit.visit_date)

        // Create date objects for start and end times
        const startTime = (visit.start_time || "09:00").split(":").map(Number)
        const endTime = (visit.end_time || "17:00").split(":").map(Number)

        const startDate = new Date(
          visitDate.getFullYear(),
          visitDate.getMonth(),
          visitDate.getDate(),
          startTime[0],
          startTime[1],
          0,
        )

        const endDate = new Date(
          visitDate.getFullYear(),
          visitDate.getMonth(),
          visitDate.getDate(),
          endTime[0],
          endTime[1],
          0,
        )

        // Check if there's a corresponding room booking for this contractor visit
        const associatedRoomBooking = roomBookings.find((booking) => {
          // Check if the booking description mentions contractor or volunteer visit
          if (!booking.description?.includes("Contractor visit:") && !booking.description?.includes("Volunteer visit:"))
            return false

          // Check if dates and times match
          const bookingStart = parseISO(booking.start_time)
          const bookingEnd = parseISO(booking.end_time)

          return (
            bookingStart.getFullYear() === startDate.getFullYear() &&
            bookingStart.getMonth() === startDate.getMonth() &&
            bookingStart.getDate() === startDate.getDate() &&
            bookingStart.getHours() === startDate.getHours() &&
            bookingEnd.getHours() === endDate.getHours()
          )
        })

        // Find room name if there's an associated booking
        let roomName = ""
        if (associatedRoomBooking) {
          const room = rooms.find((r) => r.id === associatedRoomBooking.room_id)
          if (room) {
            roomName = room.name
          }
        }

        // Create title without room information
        const title = `${contractorName} (${contractorType === "volunteer" ? "Vol" : "Con"})`

        console.log(
          `[FacilityCalendar] Processing ${contractorType} visit: ${contractorName} on ${format(visitDate, "yyyy-MM-dd")}${roomName ? ` in ${roomName}` : ""}`,
        )

        allEvents.push({
          id: `contractor-${visit.id}`,
          title: title,
          start: startDate,
          end: endDate,
          type: "contractor",
          description: visit.purpose,
          color: isVolunteer ? "green" : "amber",
          colorClass: isVolunteer ? "bg-green-100" : "bg-amber-100",
          borderClass: isVolunteer ? "border-green-300" : "border-amber-300",
          lightClass: isVolunteer ? "bg-green-50" : "bg-amber-50",
          entityId: visit.contractor_id,
          entityName: `${contractorName} (${contractorType})`,
          isRecurring: Boolean(visit.is_recurring),
          roomName: roomName || null,
          bookedBy: visit.authorizer || null,
        })
      })
    }

    // Process partner visits
    if (showPartnerVisits) {
      partnerVisits.forEach((visit) => {
        // Get partner name either from the join or from the partners array
        const partnerName =
          visit.partners?.name ||
          partners.find((p) => p.id === visit.partner_id)?.name ||
          visit.partner_name ||
          "Unknown Partner"

        // Parse the visit date from the database
        const visitDate = parseISO(visit.visit_date)

        // Create date objects for start and end times
        // Use the date part from visitDate and the time part from start_time/end_time
        const startTime = (visit.start_time || "09:00").split(":").map(Number)
        const endTime = (visit.end_time || "17:00").split(":").map(Number)

        // Create new Date objects with the correct date and time components
        const startDate = new Date(
          visitDate.getFullYear(),
          visitDate.getMonth(),
          visitDate.getDate(),
          startTime[0],
          startTime[1],
          0,
        )

        const endDate = new Date(
          visitDate.getFullYear(),
          visitDate.getMonth(),
          visitDate.getDate(),
          endTime[0],
          endTime[1],
          0,
        )

        // Check if there's a corresponding room booking for this partner visit
        // Look for room bookings with descriptions that mention this partner visit
        const associatedRoomBooking = roomBookings.find((booking) => {
          // Check if the booking description mentions partner guest visit
          if (!booking.description?.includes("Partner guest visit:")) return false

          // Check if dates match
          const bookingStart = parseISO(booking.start_time)
          const bookingEnd = parseISO(booking.end_time)

          return (
            bookingStart.getFullYear() === startDate.getFullYear() &&
            bookingStart.getMonth() === startDate.getMonth() &&
            bookingStart.getDate() === startDate.getDate() &&
            bookingStart.getHours() === startDate.getHours() &&
            bookingEnd.getHours() === endDate.getHours()
          )
        })

        // Find room name if there's an associated booking
        let roomName = ""
        if (associatedRoomBooking) {
          const room = rooms.find((r) => r.id === associatedRoomBooking.room_id)
          if (room) {
            roomName = room.name
          }
        }

        // Create title with check-in/check-out times if available
        let title = partnerName
        if (visit.check_in_time || visit.check_out_time) {
          const checkInDisplay = visit.check_in_time ? formatTime(visit.check_in_time) : "Not checked in"
          const checkOutDisplay = visit.check_out_time ? formatTime(visit.check_out_time) : "Not checked out"
          title = `${partnerName} (In: ${checkInDisplay}, Out: ${checkOutDisplay})`
        }

        // Add room to title if available
        if (roomName) {
          title = `${title} - ${roomName}`
        }

        console.log(
          `[FacilityCalendar] Processing partner visit: ${partnerName} on ${format(visitDate, "yyyy-MM-dd")}${roomName ? ` in ${roomName}` : ""}`,
        )

        allEvents.push({
          id: `partner-${visit.id}`,
          title: title,
          start: startDate,
          end: endDate,
          type: "partner",
          description: visit.purpose || visit.guest_details,
          color: "purple",
          colorClass: "bg-purple-100",
          borderClass: "border-purple-300",
          lightClass: "bg-purple-50",
          entityId: visit.partner_id || "",
          entityName: partnerName,
          roomName: roomName || null,
          bookedBy: visit.authorizer || null,
        })
      })
    }

    // Apply room filters if any are selected
    let filteredEvents = allEvents
    if (selectedRooms.length > 0) {
      filteredEvents = allEvents.filter((event) => event.type !== "room" || selectedRooms.includes(event.roomId || ""))
    }

    // Apply recurring filter
    if (!showRecurringEvents) {
      filteredEvents = filteredEvents.filter((event) => !event.isRecurring)
    }

    // Apply search filter if any
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredEvents = filteredEvents.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          (event.description && event.description.toLowerCase().includes(query)) ||
          event.entityName.toLowerCase().includes(query),
      )
    }

    console.log("[FacilityCalendar] Processed events:", {
      total: allEvents.length,
      rooms: allEvents.filter((e) => e.type === "room").length,
      contractors: allEvents.filter((e) => e.type === "contractor").length,
      partners: allEvents.filter((e) => e.type === "partner").length,
    })

    setEvents(filteredEvents)

    // Update selected day events
    const dayEvents = filteredEvents.filter((event) => {
      // Compare the date components directly to avoid timezone issues
      const eventDate = event.start
      const selectedDateObj = selectedDate

      return (
        eventDate.getFullYear() === selectedDateObj.getFullYear() &&
        eventDate.getMonth() === selectedDateObj.getMonth() &&
        eventDate.getDate() === selectedDateObj.getDate()
      )
    })

    setSelectedEvents(dayEvents)
  }, [
    roomBookings,
    contractorVisits,
    partnerVisits,
    contractors,
    partners,
    rooms,
    selectedDate,
    showRoomBookings,
    showContractorVisits,
    showPartnerVisits,
    showRecurringEvents,
    selectedRooms,
    searchQuery,
  ])

  // Navigation functions
  const previousMonth = () => {
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

  const nextMonth = () => {
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

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Generate calendar days for the month
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

  // Get events for a specific day - with explicit date component comparison
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      // Compare the date components directly to avoid timezone issues
      const eventDate = event.start

      return (
        eventDate.getFullYear() === day.getFullYear() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getDate() === day.getDate()
      )
    })
  }

  const getEventIcon = (type: string, title?: string) => {
    switch (type) {
      case "room":
        return <DoorOpen className="h-3 w-3 mr-1 shrink-0" />
      case "contractor":
        // Check if it's a volunteer based on the title
        const isVolunteer = title?.includes("(Vol)")
        return isVolunteer ? <Users className="h-3 w-3 mr-1 shrink-0" /> : <HardHat className="h-3 w-3 mr-1 shrink-0" />
      case "partner":
        return <Users className="h-3 w-3 mr-1 shrink-0" />
      default:
        return <Clock className="h-3 w-3 mr-1 shrink-0" />
    }
  }

  // Toggle room selection
  const toggleRoomSelection = (roomId: string) => {
    setSelectedRooms((prev) => {
      if (prev.includes(roomId)) {
        return prev.filter((id) => id !== roomId)
      } else {
        return [...prev, roomId]
      }
    })
  }

  // Get weekend assignment for a specific date
  const getWeekendAssignments = (day: Date) => {
    if (!isWeekend(day)) return []

    // Find the Saturday of this weekend
    const saturdayDate = isSaturday(day) ? day : addDays(day, -1)
    const saturdayStr = format(saturdayDate, "yyyy-MM-dd")
    const dayOfWeek = isSaturday(day) ? "saturday" : "sunday"

    // Find all assignments for the specific day
    return weekendAssignments.filter(
      (assignment) =>
        assignment.weekend_start_date === saturdayStr && (assignment as any).day_of_week === dayOfWeek,
    )
  }

  // Handle weekend assignment modal
  const handleWeekendClick = (day: Date) => {
    if (isWeekend(day)) {
      setSelectedWeekendDate(day)
      setIsWeekendModalOpen(true)
    }
  }

  // Format time for display
  const formatTimeRange = (startTime: string, endTime: string) => {
    try {
      const startDate = new Date(`2000-01-01T${startTime}`)
      const endDate = new Date(`2000-01-01T${endTime}`)

      // Use different format based on whether minutes are 00
      const formatTime = (date: Date) => {
        return date.getMinutes() === 0 ? format(date, "h a") : format(date, "h:mm a")
      }

      const start = formatTime(startDate)
      const end = formatTime(endDate)
      return `${start} - ${end}`
    } catch {
      return ""
    }
  }

  // Refresh weekend assignments
  const refreshWeekendAssignments = async () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const viewStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const viewEnd = endOfWeek(monthEnd, { weekStartsOn: 1 } as any)

    const { data: weekendData } = await supabase
      .from("weekend_assignments")
      .select("*, caretakers(name, color)")
      .gte("weekend_start_date", viewStart.toISOString().split("T")[0])
      .lte("weekend_start_date", viewEnd.toISOString().split("T")[0])
      .order("weekend_start_date")

    setWeekendAssignments(weekendData || [])
  }

  // Format title based on view
  const getViewTitle = () => {
    if (view === "day") {
      return format(currentDate, "EEEE, MMMM d, yyyy")
    } else if (view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
    } else {
      return format(currentDate, "MMMM yyyy")
    }
  }

  return (
    <div className="space-y-6">
      {/* Tailwind CSS Safelist */}
      <div className="hidden">
        <div className="bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 bg-blue-50"></div>
        <div className="bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200 bg-purple-50"></div>
        <div className="bg-pink-100 border-pink-300 text-pink-700 hover:bg-pink-200 bg-pink-50"></div>
        <div className="bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200 bg-amber-50"></div>
        <div className="bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200 bg-emerald-50"></div>
        <div className="bg-cyan-100 border-cyan-300 text-cyan-700 hover:bg-cyan-200 bg-cyan-50"></div>
        <div className="bg-indigo-100 border-indigo-300 text-indigo-700 hover:bg-indigo-200 bg-indigo-50"></div>
        <div className="bg-rose-100 border-rose-300 text-rose-700 hover:bg-rose-200 bg-rose-50"></div>
        <div className="bg-lime-100 border-lime-300 text-lime-700 hover:bg-lime-200 bg-lime-50"></div>
        <div className="bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200 bg-orange-50"></div>
        <div className="bg-green-100 border-green-300 text-green-700 hover:bg-green-200 bg-green-50"></div>
        <div className="bg-primary/5 bg-primary/10 bg-primary/20 bg-primary/40 bg-primary/70 text-primary-foreground"></div>
        <div className="bg-muted/20 bg-muted/30 bg-muted/50"></div>
        <div className="ring-2 ring-primary ring-opacity-50 ring-inset"></div>
        <div className="text-green-500 text-green-600 text-red-500 text-red-600"></div>
        <div className="bg-green-50 bg-red-50 border-red-100 border-green-100"></div>
        <div className="bg-black/10 bg-white"></div>
      </div>
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Master Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View all room bookings, contractor visits, and partner visitors
            </p>
            {debugInfo && <p className="text-xs text-muted-foreground mt-1">{debugInfo}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goToToday} className="shadow-sm">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Today
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/debug")} className="shadow-sm">
              <AlertCircle className="mr-2 h-4 w-4" />
              Debug
            </Button>
          </div>
        </div>
      </div>

      <Card className="shadow-md border-primary/10">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Master Calendar</CardTitle>
              <CardDescription>View all events in one place</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search events..."
                  className="pl-8 w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Filter className="h-4 w-4" />
                    <span>Filter</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium">Event Types</h4>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show-rooms"
                          checked={showRoomBookings}
                          onCheckedChange={(checked) => setShowRoomBookings(!!checked)}
                        />
                        <Label htmlFor="show-rooms" className="flex items-center cursor-pointer">
                          <DoorOpen className="h-4 w-4 mr-2 text-blue-500" />
                          Room Bookings
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show-contractors"
                          checked={showContractorVisits}
                          onCheckedChange={(checked) => setShowContractorVisits(!!checked)}
                        />
                        <Label htmlFor="show-contractors" className="flex items-center cursor-pointer">
                          <div className="flex items-center gap-1">
                            <HardHat className="h-4 w-4 text-amber-500" />
                            <Users className="h-4 w-4 text-green-500" />
                          </div>
                          <span className="ml-2">Contractors & Volunteers</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show-partners"
                          checked={showPartnerVisits}
                          onCheckedChange={(checked) => setShowPartnerVisits(!!checked)}
                        />
                        <Label htmlFor="show-partners" className="flex items-center cursor-pointer">
                          <Users className="h-4 w-4 mr-2 text-purple-500" />
                          Partner Visitors
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show-recurring"
                          checked={showRecurringEvents}
                          onCheckedChange={(checked) => setShowRecurringEvents(!!checked)}
                        />
                        <Label htmlFor="show-recurring" className="flex items-center cursor-pointer">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                          Recurring Events
                        </Label>
                      </div>
                    </div>

                    {showRoomBookings && (
                      <>
                        <div className="pt-2 border-t">
                          <h4 className="font-medium mb-2">Filter Rooms</h4>
                          <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                            {rooms.map((room) => (
                              <div key={room.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`room-${room.id}`}
                                  checked={selectedRooms.length === 0 || selectedRooms.includes(room.id)}
                                  onCheckedChange={() => toggleRoomSelection(room.id)}
                                />
                                <Label htmlFor={`room-${room.id}`} className="text-sm cursor-pointer truncate">
                                  {room.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRooms([])}
                            disabled={selectedRooms.length === 0}
                          >
                            Clear Filters
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week" | "day")} className="mr-0 sm:mr-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center mb-6 bg-muted/30 p-3 rounded-md">
            <Button variant="outline" size="icon" onClick={previousMonth} className="shadow-sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-medium text-lg">{getViewTitle()}</div>
            <Button variant="outline" size="icon" onClick={nextMonth} className="shadow-sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <div className="grid grid-cols-7 gap-2">
                {Array(35)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden shadow-sm">
              {/* Day headers */}
              <div className="grid grid-cols-7 bg-muted">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <div key={day} className="py-2 text-center font-medium text-xs md:text-sm">
                    {day.substring(0, 3)}
                  </div>
                ))}
              </div>

              {/* Calendar grid - only show for month view */}
              {view === "month" && (
                <div className="bg-card">
                  {(calendarWeeks as Date[][]).map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-t border-border">
                      {week.map((day: Date) => {
                        const dayEvents = getEventsForDay(day)
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                        const isCurrentDay = isToday(day)
                        const isSelectedDay = isSameDay(day, selectedDate)

                        return (
                          <div
                            key={day.toString()}
                            className={`min-h-[100px] md:min-h-[120px] p-1 border-r border-border last:border-r-0 relative cursor-pointer transition-colors
                ${!isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""}
                ${isCurrentDay ? "bg-primary/5" : ""}
                ${isSelectedDay ? "ring-2 ring-primary ring-inset" : ""}
                ${isWeekend(day) ? "bg-blue-50/50" : ""}
                hover:bg-muted/10
              `}
                            onClick={() => {
                              setSelectedDate(day)
                            }}
                          >
                            <div className="flex justify-between items-center p-1">
                              <span
                                className={`text-xs md:text-sm inline-flex items-center justify-center rounded-full w-6 h-6 md:w-7 md:h-7
                    ${isCurrentDay ? "bg-primary text-primary-foreground font-bold" : ""}
                  `}
                              >
                                {format(day, "d")}
                              </span>
                            </div>

                            {/* Weekend Caretaker Assignment */}
                            {isWeekend(day) &&
                              (() => {
                                const assignments = getWeekendAssignments(day)
                                if (assignments.length > 0) {
                                  return (
                                    <div className="absolute top-1 right-1 max-w-[calc(100%-8px)]">
                                      {assignments.length === 1 ? (
                                        // Single assignment - full width
                                        (() => {
                                          const assignment = assignments[0]
                                          const caretakerColor = assignment.caretakers?.color || "blue"
                                          const colorClasses = {
                                            green: "bg-green-100 border-green-300 text-green-800",
                                            orange: "bg-orange-100 border-orange-300 text-orange-800",
                                            purple: "bg-purple-100 border-purple-300 text-purple-800",
                                            blue: "bg-blue-100 border-blue-300 text-blue-800",
                                          }
                                          const timeRange = formatTimeRange(assignment.start_time, assignment.end_time)

                                          return (
                                            <div
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer hover:opacity-80 ${colorClasses[caretakerColor as keyof typeof colorClasses] || colorClasses.blue}`}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleWeekendClick(day)
                                              }}
                                              title={`${assignment.caretakers?.name} (${timeRange})`}
                                            >
                                              <div className="truncate">{assignment.caretakers?.name}</div>
                                              {timeRange && (
                                                <div className="text-[8px] opacity-75 truncate">{timeRange}</div>
                                              )}
                                            </div>
                                          )
                                        })()
                                      ) : assignments.length === 2 ? (
                                        // Two assignments - horizontal split
                                        <div className="flex space-x-0.5">
                                          {assignments.map((assignment, index) => {
                                            const caretakerColor = assignment.caretakers?.color || "blue"
                                            const colorClasses = {
                                              green: "bg-green-100 border-green-300 text-green-800",
                                              orange: "bg-orange-100 border-orange-300 text-orange-800",
                                              purple: "bg-purple-100 border-purple-300 text-purple-800",
                                              blue: "bg-blue-100 border-blue-300 text-blue-800",
                                            }

                                            // Format time range without AM/PM for two assignments to save space
                                            const formatTimeRangeCompact = (startTime: string, endTime: string) => {
                                              try {
                                                const startDate = new Date(`2000-01-01T${startTime}`)
                                                const endDate = new Date(`2000-01-01T${endTime}`)

                                                const formatTimeCompact = (date: Date) => {
                                                  return date.getMinutes() === 0
                                                    ? format(date, "h")
                                                    : format(date, "h:mm")
                                                }

                                                const start = formatTimeCompact(startDate)
                                                const end = formatTimeCompact(endDate)
                                                return `${start}-${end}`
                                              } catch {
                                                return ""
                                              }
                                            }

                                            const timeRange = formatTimeRangeCompact(
                                              assignment.start_time,
                                              assignment.end_time,
                                            )

                                            return (
                                              <div
                                                key={assignment.id}
                                                className={`flex-1 px-1 py-0.5 rounded text-[9px] font-medium border cursor-pointer hover:opacity-80 ${colorClasses[caretakerColor as keyof typeof colorClasses] || colorClasses.blue}`}
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleWeekendClick(day)
                                                }}
                                                title={`${assignment.caretakers?.name} (${formatTimeRange(assignment.start_time, assignment.end_time)})`}
                                              >
                                                <div className="truncate">{assignment.caretakers?.name}</div>
                                                {timeRange && (
                                                  <div className="text-[7px] opacity-75 truncate">{timeRange}</div>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        // Three or more assignments - show first one and +X indicator
                                        <div className="flex space-x-0.5">
                                          {(() => {
                                            const assignment = assignments[0]
                                            const caretakerColor = assignment.caretakers?.color || "blue"
                                            const colorClasses = {
                                              green: "bg-green-100 border-green-300 text-green-800",
                                              orange: "bg-orange-100 border-orange-300 text-orange-800",
                                              purple: "bg-purple-100 border-purple-300 text-purple-800",
                                              blue: "bg-blue-100 border-blue-300 text-blue-800",
                                            }
                                            const timeRange = formatTimeRange(
                                              assignment.start_time,
                                              assignment.end_time,
                                            )

                                            return (
                                              <div
                                                className={`flex-1 px-1 py-0.5 rounded text-[9px] font-medium border cursor-pointer hover:opacity-80 ${colorClasses[caretakerColor as keyof typeof colorClasses] || colorClasses.blue}`}
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleWeekendClick(day)
                                                }}
                                                title={`${assignment.caretakers?.name} (${timeRange})`}
                                              >
                                                <div className="truncate">{assignment.caretakers?.name}</div>
                                                {timeRange && (
                                                  <div className="text-[7px] opacity-75 truncate">{timeRange}</div>
                                                )}
                                              </div>
                                            )
                                          })()}
                                          <div
                                            className="px-1 py-0.5 rounded text-[9px] bg-gray-100 border border-gray-300 text-gray-600 cursor-pointer hover:bg-gray-200 flex-shrink-0 min-w-[20px] text-center"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleWeekendClick(day)
                                            }}
                                            title={`${assignments.length - 1} more assignments`}
                                          >
                                            +{assignments.length - 1}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div
                                      className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 border border-gray-300 text-gray-600 cursor-pointer hover:bg-gray-200"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleWeekendClick(day)
                                      }}
                                    >
                                      Click to assign
                                    </div>
                                  )
                                }
                              })()}

                            {/* Events for this day */}
                            {(() => {
                              // Sort events so recurring ones appear first
                              const sortedDayEvents = dayEvents.sort((a, b) => {
                                // Recurring events first
                                if (a.isRecurring && !b.isRecurring) return -1
                                if (!a.isRecurring && b.isRecurring) return 1
                                // Then sort by start time
                                return a.start.getTime() - b.start.getTime()
                              })

                              return sortedDayEvents.slice(0, 3).map((event) => {
                                const isRecurring = event.isRecurring || false

                                return (
                                  <div
                                    key={event.id}
                                    className={`text-xs rounded truncate border transition-colors ${
                                      isRecurring
                                        ? `py-0.5 px-1 ${event.colorClass} ${event.borderClass} opacity-60 shadow-none`
                                        : `p-1 md:p-1.5 ${event.colorClass} ${event.borderClass} shadow-sm opacity-100`
                                    }`}
                                    title={`${event.title} (${event.start && event.end ? `${formatTime(event.start)} - ${formatTime(event.end)}` : ''})`}
                                  >
                                    {isRecurring ? (
                                      // Compact single-line layout for recurring events with orange dot (no time)
                                      <div className="flex items-center">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1 shrink-0"></div>
                                        <span className="text-[10px] md:text-xs truncate">{event.title}</span>
                                      </div>
                                    ) : (
                                      // Normal two-line layout for regular events
                                      <>
                                        <div className="flex items-center">
                                          {getEventIcon(event.type, event.title)}
                                          <span className="text-[10px] md:text-xs">
                                            {event.start && event.end ? `${formatTime(event.start)} - ${formatTime(event.end)}` : ''}
                                          </span>
                                        </div>
                                        <div className="font-medium mt-0.5 truncate text-[10px] md:text-xs">
                                          {event.type === "partner" && event.title.includes(" - ")
                                            ? event.title.split(" - ")[0] // Remove room from partner title
                                            : event.title}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )
                              })
                            })()}
                            {(() => {
                              // Sort events for the count as well
                              const sortedDayEvents = dayEvents.sort((a, b) => {
                                if (a.isRecurring && !b.isRecurring) return -1
                                if (!a.isRecurring && b.isRecurring) return 1
                                return a.start.getTime() - b.start.getTime()
                              })

                              return (
                                sortedDayEvents.length > 3 && (
                                  <div className="text-[10px] md:text-xs text-center py-0.5 md:py-1 text-primary font-medium bg-primary/5 rounded-md">
                                    +{sortedDayEvents.length - 3} more
                                  </div>
                                )
                              )
                            })()}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}

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
                  <div className="space-y-3">
                    {getEventsForDay(currentDate).length > 0 ? (
                      getEventsForDay(currentDate).map((event) => {
                        const isRecurring = event.isRecurring

                        return (
                          <Card key={event.id} className={`overflow-hidden ${event.borderClass} shadow-sm`}>
                            <CardContent className="p-0">
                              <div className={`border-l-4 ${event.borderClass} p-4 ${event.lightClass}`}>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      {isRecurring && (
                                        <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0"></div>
                                      )}
                                      <h3 className={`font-medium text-lg ${isRecurring ? "text-base" : ""}`}>
                                        {event.title === "partner" && event.title.includes(" - ")
                                          ? event.title.split(" - ")[0] // Remove room from partner title
                                          : event.title}
                                      </h3>
                                      <div
                                        className={`text-xs px-2 py-0.5 rounded-full ${event.colorClass} border ${event.borderClass}`}
                                      >
                                        {event.type === "room"
                                          ? "Room Booking"
                                          : event.type === "contractor"
                                            ? event.title.includes("(Vol)")
                                              ? "Volunteer Visit"
                                              : "Contractor Visit"
                                            : "Partner Visit"}
                                      </div>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground mt-2">
                                      <Clock className="h-4 w-4 mr-1.5 text-primary/70" />
                                      <span className="font-medium">
                                        {event.start && event.end ? `${formatTime(event.start)} - ${formatTime(event.end)}` : 'Time not set'}
                                      </span>
                                    </div>
                                    {(event.type === "room" ||
                                      (event.type === "partner" && event.title.includes(" - ")) ||
                                      event.type === "contractor") && (
                                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                                        <DoorOpen className="h-4 w-4 mr-1.5 text-primary/70" />
                                        <span>{event.type === "room" ? event.entityName : event.roomName}</span>
                                      </div>
                                    )}
                                    {event.description && (
                                      <div className="mt-2 text-sm">
                                        <span className="font-medium">Details:</span> {event.description}
                                      </div>
                                    )}
                                    {event.type === "partner" &&
                                      partnerVisits.find((visit) => `partner-${visit.id}` === event.id)
                                        ?.guest_details && (
                                        <div className="mt-2 text-sm">
                                          <span className="font-medium">Guest Details:</span>{" "}
                                          {
                                            partnerVisits.find((visit) => `partner-${visit.id}` === event.id)
                                              ?.guest_details
                                          }
                                        </div>
                                      )}
                                    {event.bookedBy && (
                                      <div className="mt-1 text-sm text-muted-foreground">
                                        <span className="font-medium">Booked by:</span> {event.bookedBy}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })
                    ) : (
                      <div className="text-center py-8 px-4 bg-muted/20 rounded-lg border border-dashed border-muted">
                        <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <h3 className="text-base font-medium mb-1">No events for this day</h3>
                        <p className="text-sm text-muted-foreground mb-3">Select a different day to see events</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Week View */}
              {view === "week" && (
                <div className="overflow-x-auto pb-4">
                  <div className="grid grid-cols-7 gap-2 md:gap-4 min-w-[800px] pt-2">
                    {(() => {
                      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
                      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
                      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

                      return weekDays.map((day) => {
                        const dayEvents = getEventsForDay(day)
                        const isCurrentDay = isToday(day)
                        const isSelectedDay = isSameDay(day, selectedDate)

                        return (
                          <div
                            key={day.toString()}
                            className={`space-y-2 pt-1 rounded-lg transition-all ${
                              isSelectedDay ? "ring-2 ring-primary ring-opacity-50" : ""
                            }`}
                            onClick={() => setSelectedDate(day)}
                          >
                            <div
                              className={`text-center p-2 md:p-3 mt-1 rounded-md shadow-sm transition-colors cursor-pointer
                                  ${
                                    isCurrentDay
                                      ? "bg-primary text-primary-foreground font-bold"
                                      : "bg-muted/50 hover:bg-muted"
                                  }
                                `}
                            >
                              <div className="text-xs md:text-sm font-medium">{format(day, "EEEE")}</div>
                              <div className="text-base md:text-lg">{format(day, "d")}</div>
                              <div className="text-xs opacity-80">{format(day, "MMM")}</div>
                            </div>
                            <div className="space-y-2 mt-2 px-1">
                              {dayEvents.length > 0 ? (
                                dayEvents.map((event) => {
                                  const isRecurring = event.isRecurring

                                  return (
                                    <div
                                      key={event.id}
                                      className={`p-1.5 md:p-2 ${event.colorClass} hover:opacity-80 ${event.borderClass} rounded-md border shadow-sm transition-colors cursor-pointer`}
                                      title={`${event.title} (${event.start && event.end ? `${formatTime(event.start)} - ${formatTime(event.end)}` : ''})`}
                                    >
                                      {isRecurring ? (
                                        <div className="flex items-center">
                                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1 shrink-0"></div>
                                          <div className="font-medium truncate text-xs md:text-sm">{event.title}</div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="font-medium truncate text-xs md:text-sm">{event.title}</div>
                                          <div className="text-xs text-muted-foreground flex items-center mt-1">
                                            {getEventIcon(event.type, event.title)}
                                            <span className="truncate">{event.start ? formatTime(event.start) : ''}</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="text-center py-4 md:py-6 text-xs md:text-sm text-muted-foreground bg-muted/20 rounded-md border border-dashed border-muted">
                                  No events
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md border-primary/10">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="flex items-center">
            <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
            Events for {format(selectedDate, "EEEE, MMMM d")}
          </CardTitle>
          <CardDescription>
            {selectedEvents.length > 0
              ? `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"} scheduled`
              : "No events scheduled"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {selectedEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedEvents.map((event) => {
                const isRecurring = event.isRecurring

                return (
                  <Card key={event.id} className={`overflow-hidden ${event.borderClass} shadow-sm`}>
                    <CardContent className="p-0">
                      <div className={`border-l-4 ${event.borderClass} p-4 ${event.lightClass}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              {isRecurring && <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0"></div>}
                              <h3 className={`font-medium text-lg ${isRecurring ? "text-base" : ""}`}>
                                {event.type === "partner" && event.title.includes(" - ")
                                  ? event.title.split(" - ")[0] // Remove room from partner title
                                  : event.title}
                              </h3>
                              <div
                                className={`text-xs px-2 py-0.5 rounded-full ${event.colorClass} border ${event.borderClass}`}
                              >
                                {event.type === "room"
                                  ? "Room Booking"
                                  : event.type === "contractor"
                                    ? event.title.includes("(Vol)")
                                      ? "Volunteer Visit"
                                      : "Contractor Visit"
                                    : "Partner Visit"}
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground mt-2">
                              <Clock className="h-4 w-4 mr-1.5 text-primary/70" />
                              <span className="font-medium">
                                {event.start && event.end ? `${formatTime(event.start)} - ${formatTime(event.end)}` : 'Time not set'}
                              </span>
                            </div>
                            {(event.type === "room" ||
                              (event.type === "partner" && event.title.includes(" - ")) ||
                              event.type === "contractor") && (
                              <div className="flex items-center text-sm text-muted-foreground mt-1">
                                <DoorOpen className="h-4 w-4 mr-1.5 text-primary/70" />
                                <span>{event.type === "room" ? event.entityName : event.roomName}</span>
                              </div>
                            )}
                            {event.description && (
                              <div className="mt-2 text-sm">
                                <span className="font-medium">Details:</span> {event.description}
                              </div>
                            )}
                            {event.type === "partner" &&
                              partnerVisits.find((visit) => `partner-${visit.id}` === event.id)?.guest_details && (
                                <div className="mt-2 text-sm">
                                  <span className="font-medium">Guest Details:</span>{" "}
                                  {partnerVisits.find((visit) => `partner-${visit.id}` === event.id)?.guest_details}
                                </div>
                              )}
                            {event.bookedBy && (
                              <div className="mt-1 text-sm text-muted-foreground">
                                <span className="font-medium">Booked by:</span> {event.bookedBy}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-muted/20 rounded-lg border border-dashed border-muted">
              <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-base font-medium mb-1">No events for this day</h3>
              <p className="text-sm text-muted-foreground mb-3">Select a different day to see events</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekend Assignment Modal */}
      <WeekendAssignmentModal
        isOpen={isWeekendModalOpen}
        onClose={() => setIsWeekendModalOpen(false)}
        selectedDate={selectedWeekendDate}
        onAssignmentChange={refreshWeekendAssignments}
      />
    </div>
  )
}
