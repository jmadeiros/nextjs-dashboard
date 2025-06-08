import { useMemo } from 'react'
import { parseISO, format } from 'date-fns'
import type { 
  ConsolidatedEvent, 
  Booking, 
  ContractorVisit, 
  GuestVisit, 
  Room,
  FilterState 
} from '@/components/facility-calendar/types'

interface UseEventProcessingOptions {
  roomBookings: Booking[]
  contractorVisits: ContractorVisit[]
  guestVisits: GuestVisit[]
  rooms: Room[]
  contractors: any[]
  partners: any[]
  filters: FilterState
}

export function useEventProcessing(options: UseEventProcessingOptions) {
  const { 
    roomBookings, 
    contractorVisits, 
    guestVisits, 
    rooms, 
    contractors, 
    partners,
    filters 
  } = options

  const consolidatedEvents = useMemo(() => {
    const allEvents: ConsolidatedEvent[] = []

    // Process room bookings
    if (filters.showRoomBookings) {
      // Group room bookings by event (same title, time, description, authorizer)
      const roomBookingGroups = new Map<string, Booking[]>()

      roomBookings.forEach((booking) => {
        // Skip room bookings that are associated with contractor/partner visits
        if (
          booking.description?.startsWith("Contractor visit:") ||
          booking.description?.startsWith("Volunteer visit:") ||
          booking.description?.startsWith("Partner guest visit:")
        ) {
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
      roomBookingGroups.forEach((bookings) => {
        if (bookings.length === 1) {
          // Single room booking
          const booking = bookings[0]
          const room = rooms.find((r) => r.id === booking.room_id)
          const roomName = room?.name || "Unknown Room"

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
            entityName: roomName,
            isRecurring: Boolean(booking.is_recurring),
            roomName: roomName,
            bookedBy: booking.authorizer || null,
          })
        } else {
          // Multiple room bookings for the same event - consolidate
          const firstBooking = bookings[0]
          const roomNames = bookings
            .map((booking) => rooms.find((r) => r.id === booking.room_id)?.name)
            .filter(Boolean)
            .join(", ") || "Unknown Rooms"

          const consolidatedId = `room-multi-${bookings.map((b) => b.id).join("-")}`

          allEvents.push({
            id: consolidatedId,
            title: `${firstBooking.title} (${bookings.length} rooms)`,
            start: parseISO(firstBooking.start_time),
            end: parseISO(firstBooking.end_time),
            type: "room",
            roomId: firstBooking.room_id,
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
    if (filters.showContractorVisits) {
      contractorVisits.forEach((visit) => {
        const contractor = contractors.find((c) => c.id === visit.contractor_id)
        const contractorName = visit.contractors?.name || contractor?.name || "Unknown Contractor"
        const contractorType = contractor?.type || "contractor"

        const visitDate = parseISO(visit.visit_date)
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

        const title = `${contractorName} (${contractorType === "volunteer" ? "Vol" : "Con"})`

        allEvents.push({
          id: `contractor-${visit.id}`,
          title: title,
          start: startDate,
          end: endDate,
          type: "contractor",
          description: visit.purpose,
          color: contractorType === "volunteer" ? "green" : "orange",
          colorClass: contractorType === "volunteer" ? "bg-green-100" : "bg-orange-100",
          borderClass: contractorType === "volunteer" ? "border-green-300" : "border-orange-300",
          lightClass: contractorType === "volunteer" ? "bg-green-50" : "bg-orange-50",
          entityId: visit.contractor_id,
          entityName: contractorName,
          isRecurring: Boolean(visit.is_recurring),
          roomName: null,
          bookedBy: visit.authorizer || null,
        })
      })
    }

    // Process partner visits
    if (filters.showPartnerVisits) {
      guestVisits.forEach((visit) => {
        const partner = partners.find((p) => p.id === visit.partner_id)
        const partnerName = visit.partners?.name || partner?.name || "Unknown Partner"

        const visitDate = parseISO(visit.visit_date)
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

        allEvents.push({
          id: `partner-${visit.id}`,
          title: `${partnerName} (Partner)`,
          start: startDate,
          end: endDate,
          type: "partner",
          description: visit.purpose,
          color: "purple",
          colorClass: "bg-purple-100",
          borderClass: "border-purple-300",
          lightClass: "bg-purple-50",
          entityId: visit.partner_id || visit.id,
          entityName: partnerName,
          isRecurring: false,
          roomName: null,
          bookedBy: visit.authorizer || null,
        })
      })
    }

    // Apply filters
    let filteredEvents = allEvents

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filteredEvents = filteredEvents.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.entityName.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query)
      )
    }

    // Filter by selected rooms
    if (filters.selectedRooms.length > 0) {
      filteredEvents = filteredEvents.filter(
        (event) => !event.roomId || filters.selectedRooms.includes(event.roomId)
      )
    }

    // Filter by recurring events
    if (!filters.showRecurringEvents) {
      filteredEvents = filteredEvents.filter((event) => !event.isRecurring)
    }

    return filteredEvents
  }, [
    roomBookings,
    contractorVisits,
    guestVisits,
    rooms,
    contractors,
    partners,
    filters,
  ])

  return {
    events: consolidatedEvents,
  }
} 