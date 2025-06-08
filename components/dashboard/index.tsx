"use client"

import React from "react"
import { v4 as uuidv4 } from "uuid"
import { format, isToday, parseISO, isSameDay } from "date-fns"
import { AlertCircle, CalendarIcon, Plus } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useDashboard } from "@/hooks/use-dashboard"
import { getCalendarData, getViewTitle } from "@/lib/dashboard-utils"
import BookingForm from "@/components/booking-form"
import BookingList from "@/components/booking-list"
import SupabaseTest from "@/components/supabase-test"
import DebugPanel from "@/components/debug-panel"
import DashboardHeader from "./dashboard-header"
import RoomSidebar from "./room-sidebar"
import CalendarNavigation from "./calendar-navigation"
import CalendarViews from "./calendar-views"
import type { DashboardProps } from "./types"

export default function Dashboard({ rooms, userId }: DashboardProps) {
  const { state, actions, retryFetch } = useDashboard(rooms, userId)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Generate calendar data
  const calendarData = getCalendarData(state.currentDate)

  // Helper function to get bookings for a specific day
  const getBookingsForDay = (day: Date) => {
    return state.bookings.filter((booking) => {
      const bookingDate = parseISO(booking.start_time)
      return isSameDay(bookingDate, day)
    })
  }

  // Get formatted view title
  const getFormattedViewTitle = () => {
    return getViewTitle(state.view, state.currentDate, isMobile)
  }

  // Loading state for rooms
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

        {/* Error Alert */}
        {state.fetchError && (
          <Alert variant={state.fetchError.includes("Retrying") ? "default" : "destructive"} className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{state.fetchError.includes("Retrying") ? "Loading Data" : "Error Loading Data"}</AlertTitle>
            <AlertDescription>
              {state.fetchError}
              {state.fetchError.includes("Too many requests") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={retryFetch}
                >
                  Try Again
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Dashboard Header */}
        <DashboardHeader
          showAllRooms={state.showAllRooms}
          selectedRoom={state.selectedRoom}
          lastRefreshTime={state.lastRefreshTime}
          isLoading={state.isLoading}
          onRefresh={() => actions.fetchBookings(true)}
          onToday={actions.navigateToday}
          onNewBooking={() => actions.openBookingForm()}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Room Sidebar */}
          <div className="md:col-span-1">
            <RoomSidebar
              rooms={rooms}
              selectedRoom={state.selectedRoom}
              showAllRooms={state.showAllRooms}
              onRoomChange={actions.handleRoomChange}
              onShowAllRooms={() => actions.setShowAllRooms(true)}
            />
          </div>

          {/* Main Calendar Area */}
          <div className="md:col-span-3 space-y-6">
            <Card className="shadow-md border-primary/10">
              <CardHeader className="bg-muted/50 border-b pb-3">
                <CalendarNavigation
                  view={state.view}
                  currentDate={state.currentDate}
                  onPrevious={actions.navigatePrevious}
                  onNext={actions.navigateNext}
                  onViewChange={actions.handleViewChange}
                  getViewTitle={getFormattedViewTitle}
                  isMobile={isMobile}
                />
              </CardHeader>
              <CardContent className="p-4">
                <CalendarViews
                  view={state.view}
                  currentDate={state.currentDate}
                  selectedDate={state.selectedDate}
                  bookings={state.bookings}
                  rooms={rooms}
                  isLoading={state.isLoading}
                  calendarData={calendarData}
                  onDateSelect={actions.handleDateSelect}
                  onOpenBookingForm={actions.openBookingForm}
                  getBookingsForDay={getBookingsForDay}
                  isMobile={isMobile}
                />
              </CardContent>
            </Card>

            {/* Selected Day Bookings - only show in week and month views */}
            {state.view !== "day" && (
              <Card className="shadow-md border-primary/10">
                <CardHeader className="bg-muted/50 border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center text-base md:text-lg">
                      <CalendarIcon className="mr-2 h-4 w-4 md:h-5 md:w-5 text-primary" />
                      Bookings for {format(state.selectedDate, "MMMM d, yyyy")}
                      {isToday(state.selectedDate) && (
                        <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Today</span>
                      )}
                    </CardTitle>
                    <Button size="sm" onClick={() => actions.openBookingForm()} className="shadow-sm gap-1" variant="outline">
                      <Plus className="h-3.5 w-3.5" /> Book
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <BookingList
                    bookings={state.selectedDateBookings}
                    isLoading={state.isLoading}
                    userId={userId}
                    onBookingDeleted={actions.handleBookingDeleted}
                    rooms={rooms}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Booking Form */}
        <BookingForm
          isOpen={state.isBookingFormOpen}
          onClose={() => {
            actions.setIsBookingFormOpen(false)
            actions.setBookingFormRoom(null)
          }}
          rooms={rooms}
          selectedRoom={state.bookingFormRoom || state.selectedRoom}
          userId={userId || uuidv4()}
          selectedDate={state.selectedDate}
          onBookingCreated={actions.handleBookingCreated}
        />
      </div>
    </TooltipProvider>
  )
} 