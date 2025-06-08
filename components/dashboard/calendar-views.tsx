"use client"

import React from "react"
import { format, isSameDay, isSameMonth, isToday, parseISO } from "date-fns"
import { CalendarIcon, Clock, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import BookingList from "@/components/booking-list"
import { getRoomColor } from "@/lib/colors"
import { formatTime } from "@/lib/time-utils"
import type { CalendarViewProps } from "./types"

export default function CalendarViews({
  view,
  currentDate,
  selectedDate,
  rooms,
  isLoading,
  calendarData,
  onDateSelect,
  onOpenBookingForm,
  getBookingsForDay,
  isMobile,
}: CalendarViewProps) {
  // Day View
  if (view === "day") {
    return (
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
          userId=""
          onBookingDeleted={() => {}}
          rooms={rooms}
        />
      </div>
    )
  }

  // Week View
  if (view === "week") {
    return (
      <div className="overflow-x-auto pb-4">
        <div
          className={`grid grid-cols-7 gap-2 md:gap-4 ${isMobile ? "min-w-[700px]" : "min-w-[800px]"} pt-2`}
        >
          {calendarData.weekDays.map((day) => {
            const dayBookings = getBookingsForDay(day)
            const isCurrentDay = isToday(day)
            const isSelectedDay = isSameDay(day, selectedDate)

            return (
              <div
                key={day.toString()}
                className={`space-y-2 pt-1 rounded-lg transition-all cursor-pointer ${
                  isSelectedDay ? "ring-2 ring-primary ring-opacity-50" : ""
                }`}
                onClick={() => onDateSelect(day)}
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
    )
  }

  // Month View
  return (
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
        {calendarData.calendarWeeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-t border-border">
            {week.map((day) => {
              const dayBookings = getBookingsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isCurrentDay = isToday(day)
              const isSelectedDay = isSameDay(day, selectedDate)

              return (
                <div
                  key={day.toString()}
                  className={`min-h-[80px] md:min-h-[120px] p-1 border-r border-border last:border-r-0 relative cursor-pointer transition-colors group
                    ${!isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""}
                    ${isCurrentDay ? "bg-primary/5" : ""}
                    ${isSelectedDay ? "ring-2 ring-primary ring-inset" : ""}
                    hover:bg-muted/10
                  `}
                  onClick={() => onDateSelect(day)}
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
                          onDateSelect(day)
                          onOpenBookingForm()
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
  )
} 