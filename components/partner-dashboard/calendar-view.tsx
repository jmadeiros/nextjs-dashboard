"use client"

import React from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday } from "date-fns"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Trash2, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Partner, EnhancedGuestVisit } from "./types"

interface CalendarViewProps {
  currentDate: Date
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onPreviousMonth: () => void
  onNextMonth: () => void
  visits: EnhancedGuestVisit[]
  isLoading: boolean
  onDeleteVisit: (visit: EnhancedGuestVisit) => void
  onNewVisit: (date: Date) => void
}

export default function CalendarView({
  currentDate,
  selectedDate,
  onDateSelect,
  onPreviousMonth,
  onNextMonth,
  visits,
  isLoading,
  onDeleteVisit,
  onNewVisit,
}: CalendarViewProps) {
  // Generate calendar days for the month
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get visits for a specific day
  const getVisitsForDay = (day: Date) => {
    return visits.filter((visit) => {
      const visitDate = parseISO(visit.visit_date)
      return isSameDay(visitDate, day)
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4 bg-muted/30 p-3 rounded-md">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array(31)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Calendar Navigation */}
      <div className="flex justify-between items-center mb-4 bg-muted/30 p-3 rounded-md">
        <Button variant="outline" size="icon" onClick={onPreviousMonth} className="shadow-sm">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium text-lg">{format(currentDate, "MMMM yyyy")}</div>
        <Button variant="outline" size="icon" onClick={onNextMonth} className="shadow-sm">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div>
        {/* Day Headers */}
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

          {/* Calendar Days */}
          {calendarDays.map((day) => {
            const dayVisits = getVisitsForDay(day)
            const isCurrentDay = isToday(day)
            const isSelected = isSameDay(day, selectedDate)

            return (
              <div
                key={day.toString()}
                className={`h-24 rounded-md border transition-colors hover:bg-muted/50 ${
                  isCurrentDay ? "bg-primary/5 border-primary/20" : "bg-card"
                } ${isSelected ? "ring-2 ring-primary ring-opacity-50" : ""} flex flex-col p-2 cursor-pointer`}
                onClick={() => onDateSelect(day)}
              >
                {/* Day Number */}
                <div
                  className={`text-sm font-medium flex-shrink-0 ${
                    isCurrentDay
                      ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                      : ""
                  }`}
                >
                  {format(day, "d")}
                </div>

                {/* Visits for this day */}
                <div className="mt-1 overflow-y-auto flex-1 space-y-1">
                  {dayVisits.slice(0, 3).map((visit) => (
                    <div
                      key={visit.id}
                      className="text-xs p-1 bg-purple-100 border border-purple-300 rounded group relative hover:bg-purple-200 transition-colors"
                      title={`${visit.partners?.name || "Unknown Partner"} (${visit.start_time} - ${visit.end_time})${visit.guest_details ? `: ${visit.guest_details}` : ""}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-purple-800">{visit.partners?.name || "Unknown Partner"}</div>
                          {visit.guest_details && (
                            <div className="text-[10px] text-purple-700 truncate">
                              {visit.guest_details.length > 20
                                ? visit.guest_details.substring(0, 20) + "..."
                                : visit.guest_details}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 ml-1 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteVisit(visit)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Show "more" indicator if there are more visits */}
                  {dayVisits.length > 3 && (
                    <div className="text-xs text-center py-1 text-primary font-medium bg-primary/5 rounded-md">
                      +{dayVisits.length - 3} more
                    </div>
                  )}

                  {/* Add visit button for empty days */}
                  {dayVisits.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          onNewVisit(day)
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add empty cells for days after the end of the month */}
          {Array(6 - ((monthEnd.getDay() + 6) % 7))
            .fill(null)
            .map((_, index) => (
              <div key={`empty-end-${index}`} className="h-24 rounded-md"></div>
            ))}
        </div>
      </div>
    </div>
  )
} 