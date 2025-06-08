import type { Database } from "@/types/supabase"

export type Contractor = Database["public"]["Tables"]["contractors"]["Row"]
export type ContractorVisit = Database["public"]["Tables"]["contractor_visits"]["Row"]
export type Room = Database["public"]["Tables"]["rooms"]["Row"]

export interface ContractorDashboardProps {
  userId: string
  rooms?: Room[]
}

export interface VisitFormData {
  contractorId: string
  contractorName: string
  company: string
  email: string
  phone: string
  visitDate: Date
  startTime: string
  endTime: string
  purpose: string
  type: "contractor" | "volunteer"
  isNewContractor: boolean
  isRecurring: boolean
  recurrenceType: "weekly" | "bi-weekly" | "monthly"
  recurrenceEndDate: Date | null
  includeRoomBooking: boolean
  selectedRoomId: string
  roomBookingTitle: string
  authorizer: string
  isCustomAuthorizer: boolean
  customAuthorizerName: string
}

export interface ContractorDashboardState {
  currentDate: Date
  selectedDate: Date
  contractors: Contractor[]
  visits: ContractorVisit[]
  isLoading: boolean
  error: string | null
  view: "month" | "list"
  isFormOpen: boolean
  searchQuery: string
  showDebug: boolean
  deleteDialogOpen: boolean
  visitToDelete: ContractorVisit | null
  isDeleting: boolean
  isSubmitting: boolean
  formError: string | null
} 