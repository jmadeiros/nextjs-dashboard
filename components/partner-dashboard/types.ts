import type { Database } from "@/types/supabase"

export type GuestVisit = Database["public"]["Tables"]["guest_visits"]["Row"]

export type Partner = {
  id: string
  name: string
  company?: string | null
  email?: string | null
  phone?: string | null
}

export type Room = {
  id: string
  name: string
}

export interface PartnerDashboardProps {
  userId?: string
}

export interface VisitFormData {
  partnerId: string
  partnerName: string
  visitDate: Date
  startTime: string
  endTime: string
  guestDetails: string
  purpose: string
  isFullDay: boolean
  isNewPartner: boolean
  includeRoomBooking: boolean
  selectedRoomId: string
  roomBookingTitle: string
  authorizer: string
  isCustomAuthorizer: boolean
  customAuthorizerName: string
}

export interface PartnerDashboardState {
  currentDate: Date
  selectedDate: Date
  partners: Partner[]
  visits: GuestVisit[]
  rooms: Room[]
  isLoading: boolean
  error: string | null
  view: "month" | "list"
  searchQuery: string
  debugInfo: string
  isFormOpen: boolean
  deleteDialogOpen: boolean
  visitToDelete: GuestVisit | null
  isDeleting: boolean
  isSubmitting: boolean
  formError: string | null
}

export interface EnhancedGuestVisit extends Omit<GuestVisit, 'partners'> {
  partners?: {
    name: string
  } | null
} 