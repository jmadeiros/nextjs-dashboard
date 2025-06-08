import type { Database } from "@/types/supabase"

export type Room = Database["public"]["Tables"]["rooms"]["Row"]
export type Booking = Database["public"]["Tables"]["bookings"]["Row"]
export type ViewType = "day" | "week" | "month"

export interface DashboardProps {
  rooms: Room[]
  userId: string
}

export interface DashboardState {
  currentDate: Date
  selectedDate: Date
  selectedRoom: Room | null
  bookings: Booking[]
  isBookingFormOpen: boolean
  isLoading: boolean
  view: ViewType
  selectedDateBookings: Booking[]
  bookingFormRoom: Room | null
  fetchError: string | null
  showAllRooms: boolean
  lastRefreshTime: Date
}

export interface DashboardActions {
  handleRoomChange: (room: Room) => void
  handleDateSelect: (date: Date) => void
  handleViewChange: (newView: ViewType) => void
  handleBookingCreated: (newBooking: Booking) => void
  handleBookingDeleted: (bookingId: string) => void
  openBookingForm: (room?: Room | null) => void
  navigatePrevious: () => void
  navigateNext: () => void
  navigateToday: () => void
  fetchBookings: (forceRefresh?: boolean) => Promise<void>
  setShowAllRooms: (show: boolean) => void
  setIsBookingFormOpen: (open: boolean) => void
  setBookingFormRoom: (room: Room | null) => void
}

export interface CalendarData {
  monthStart: Date
  monthEnd: Date
  calendarDays: Date[]
  calendarWeeks: Date[][]
  weekDays: Date[]
}

export interface CalendarViewProps {
  view: ViewType
  currentDate: Date
  selectedDate: Date
  bookings: Booking[]
  rooms: Room[]
  isLoading: boolean
  calendarData: CalendarData
  onDateSelect: (date: Date) => void
  onOpenBookingForm: (room?: Room | null) => void
  getBookingsForDay: (day: Date) => Booking[]
  isMobile: boolean
}

export interface NavigationProps {
  view: ViewType
  currentDate: Date
  onPrevious: () => void
  onNext: () => void
  getViewTitle: () => string
  isMobile: boolean
}

export interface DashboardHeaderProps {
  showAllRooms: boolean
  selectedRoom: Room | null
  lastRefreshTime: Date
  isLoading: boolean
  onRefresh: () => void
  onToday: () => void
  onNewBooking: () => void
}

export interface RoomSidebarProps {
  rooms: Room[]
  selectedRoom: Room | null
  showAllRooms: boolean
  onRoomChange: (room: Room) => void
  onShowAllRooms: () => void
} 