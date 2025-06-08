import type { Database } from "@/types/supabase"

export type Room = Database["public"]["Tables"]["rooms"]["Row"]
export type Booking = Database["public"]["Tables"]["bookings"]["Row"]
export type ContractorVisit = Database["public"]["Tables"]["contractor_visits"]["Row"] & {
  contractors: { name: string; type: string } | null
}
export type GuestVisit = Database["public"]["Tables"]["guest_visits"]["Row"] & {
  partners: { name: string } | null
}
export type Caretaker = Database["public"]["Tables"]["caretakers"]["Row"]
export type WeekendAssignment = Database["public"]["Tables"]["weekend_assignments"]["Row"] & {
  caretakers: { name: string; color: string } | null
  date: string
}

// Define a unified event type that can represent any of our event types
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
  entityId: string // ID of the related entity (room, contractor, partner, or other event)
  entityName: string // Name of the related entity
  isRecurring?: boolean // Add this field
  roomName?: string | null // Add room name (can be null for non-room events)
  bookedBy?: string | null // Add who booked it
}

export interface FacilityCalendarProps {
  rooms: Room[]
  userId: string
}

export interface FilterState {
  showRoomBookings: boolean
  showContractorVisits: boolean
  showPartnerVisits: boolean
  showRecurringEvents: boolean
  selectedRooms: string[]
  searchQuery: string
} 