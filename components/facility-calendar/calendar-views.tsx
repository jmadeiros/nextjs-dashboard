"use client"

import React from "react"
import { format, isToday, isSameDay, isWeekend, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CalendarIcon, Clock, DoorOpen, Users, HardHat } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatTime } from "@/lib/time-utils"
import { getCalendarWeeks, getEventIcon } from "@/lib/utils/calendar-utils"
import type { ConsolidatedEvent, WeekendAssignment } from "./types"
import type { ViewType } from "@/hooks/use-calendar-navigation"

interface CalendarViewsProps {
  view: ViewType
  currentDate: Date
  selectedDate: Date
  onDateSelect: (date: Date) => void
  events: ConsolidatedEvent[]
  selectedEvents: ConsolidatedEvent[]
  isLoading: boolean
  weekendAssignments: WeekendAssignment[]
  onWeekendClick: (date: Date) => void
  guestVisits: Array<{
    id: string
    guest_details?: string | null
    [key: string]: any
  }>
}

export default function CalendarViews({
  view,
  currentDate,
  selectedDate,
  onDateSelect,
  events,
  selectedEvents,
  isLoading,
  weekendAssignments,
  onWeekendClick,
  guestVisits,
}: CalendarViewsProps) {
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(event.start, day))
  }

  const getWeekendAssignments = (day: Date) => {
    return weekendAssignments.filter((assignment) => isSameDay(new Date(assignment.date), day))
  }

  const formatTimeRange = (startTime: string, endTime: string) => {
    try {
      const formatTime = (date: Date) => {
        return format(date, "h:mma")
      }
      const start = formatTime(new Date(`2000-01-01T${startTime}`))
      const end = formatTime(new Date(`2000-01-01T${endTime}`))
      return `${start} - ${end}`
    } catch {
      return ""
    }
  }

  // Function to render icon based on type
  const renderEventIcon = (type: string, title?: string): React.ReactElement => {
    const iconInfo = getEventIcon(type, title)
    const IconComponent = {
      DoorOpen,
      Users,
      HardHat,
      Clock,
    }[iconInfo.icon] || Clock

    return <IconComponent className={iconInfo.className} />
  }

  if (isLoading) {
    return (
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
    )
  }

  return (
    <div className="space-y-6">
      {/* Calendar Grid */}
      <div className="rounded-lg border border-border overflow-hidden shadow-sm">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted">
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
            <div key={day} className="py-2 text-center font-medium text-xs md:text-sm">
              {day.substring(0, 3)}
            </div>
          ))}
        </div>

        {/* Month View */}
        {view === "month" && (
          <div className="bg-card">
            {getCalendarWeeks(currentDate).map((week: Date[], weekIndex: number) => (
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
                      </div>

                      {/* Weekend Caretaker Assignment */}
                      {isWeekend(day) && (
                        <WeekendAssignmentDisplay
                          day={day}
                          assignments={getWeekendAssignments(day)}
                          onWeekendClick={onWeekendClick}
                          formatTimeRange={formatTimeRange}
                        />
                      )}

                      {/* Events for this day */}
                      <div className="space-y-1 mt-1">
                        {dayEvents
                          .sort((a, b) => {
                            if (a.isRecurring && !b.isRecurring) return -1
                            if (!a.isRecurring && b.isRecurring) return 1
                            return a.start.getTime() - b.start.getTime()
                          })
                          .slice(0, 3)
                          .map((event) => (
                            <EventDisplay key={event.id} event={event} isCompact renderIcon={renderEventIcon} />
                          ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center bg-muted/20 rounded px-1 py-0.5">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
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
                      onClick={() => onDateSelect(day)}
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
                          dayEvents.map((event) => (
                            <EventDisplay key={event.id} event={event} renderIcon={renderEventIcon} />
                          ))
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

        {/* Day View */}
        {view === "day" && (
          <div className="p-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">{format(selectedDate, "EEEE, MMMM d, yyyy")}</h3>
            </div>
            <div className="space-y-3">
              {selectedEvents.length > 0 ? (
                selectedEvents.map((event) => (
                  <EventDisplay key={event.id} event={event} isDetailed renderIcon={renderEventIcon} />
                ))
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
      </div>

      {/* Selected Date Events */}
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
              {selectedEvents.map((event) => (
                <EventDetailCard key={event.id} event={event} guestVisits={guestVisits} />
              ))}
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
    </div>
  )
}

// Event Display Component
function EventDisplay({ 
  event, 
  isCompact = false, 
  isDetailed = false,
  renderIcon 
}: { 
  event: ConsolidatedEvent; 
  isCompact?: boolean; 
  isDetailed?: boolean;
  renderIcon: (type: string, title?: string) => React.ReactElement;
}) {
  const isRecurring = event.isRecurring || false

  if (isCompact) {
    return (
      <div
        className={`p-1 ${event.colorClass} hover:opacity-80 ${event.borderClass} rounded text-xs border cursor-pointer transition-colors`}
        title={`${event.title} (${event.start && event.end ? `${formatTime(event.start)} - ${formatTime(event.end)}` : ''})`}
      >
        {isRecurring ? (
          <div className="flex items-center">
            <div className="w-1 h-1 bg-orange-500 rounded-full mr-1 shrink-0"></div>
            <div className="font-medium truncate">{event.title}</div>
          </div>
        ) : (
          <div className="font-medium truncate">{event.title}</div>
        )}
      </div>
    )
  }

  return (
    <div
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
            {renderIcon(event.type, event.title)}
            <span className="truncate">{event.start ? formatTime(event.start) : ''}</span>
          </div>
        </>
      )}
    </div>
  )
}

// Event Detail Card Component
function EventDetailCard({ event, guestVisits }: { event: ConsolidatedEvent; guestVisits: any[] }) {
  const isRecurring = event.isRecurring

  return (
    <Card className={`overflow-hidden ${event.borderClass} shadow-sm`}>
      <CardContent className="p-0">
        <div className={`border-l-4 ${event.borderClass} p-4 ${event.lightClass}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                {isRecurring && <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0"></div>}
                <h3 className={`font-medium text-lg ${isRecurring ? "text-base" : ""}`}>
                  {event.type === "partner" && event.title.includes(" - ")
                    ? event.title.split(" - ")[0]
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
                guestVisits.find((visit) => `partner-${visit.id}` === event.id)?.guest_details && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Guest Details:</span>{" "}
                    {guestVisits.find((visit) => `partner-${visit.id}` === event.id)?.guest_details}
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
}

// Weekend Assignment Display Component
function WeekendAssignmentDisplay({ 
  day, 
  assignments, 
  onWeekendClick, 
  formatTimeRange 
}: { 
  day: Date; 
  assignments: WeekendAssignment[]; 
  onWeekendClick: (date: Date) => void; 
  formatTimeRange: (start: string, end: string) => string;
}) {
  if (assignments.length === 0) {
    return (
      <div
        className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 border border-gray-300 text-gray-600 cursor-pointer hover:bg-gray-200"
        onClick={(e) => {
          e.stopPropagation()
          onWeekendClick(day)
        }}
      >
        Click to assign
      </div>
    )
  }

  const colorClasses = {
    green: "bg-green-100 border-green-300 text-green-800",
    orange: "bg-orange-100 border-orange-300 text-orange-800",
    purple: "bg-purple-100 border-purple-300 text-purple-800",
    blue: "bg-blue-100 border-blue-300 text-blue-800",
  }

  if (assignments.length === 1) {
    const assignment = assignments[0]
    const caretakerColor = assignment.caretakers?.color || "blue"
    const timeRange = formatTimeRange(assignment.start_time, assignment.end_time)

    return (
      <div className="absolute top-1 right-1 max-w-[calc(100%-8px)]">
        <div
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer hover:opacity-80 ${colorClasses[caretakerColor as keyof typeof colorClasses] || colorClasses.blue}`}
          onClick={(e) => {
            e.stopPropagation()
            onWeekendClick(day)
          }}
          title={`${assignment.caretakers?.name} (${timeRange})`}
        >
          <div className="truncate">{assignment.caretakers?.name}</div>
          {timeRange && (
            <div className="text-[8px] opacity-75 truncate">{timeRange}</div>
          )}
        </div>
      </div>
    )
  }

  // Multiple assignments
  return (
    <div className="absolute top-1 right-1 max-w-[calc(100%-8px)]">
      <div className="flex space-x-0.5">
        {assignments.slice(0, assignments.length === 2 ? 2 : 1).map((assignment) => {
          const caretakerColor = assignment.caretakers?.color || "blue"
          const timeRange = assignments.length === 2 
            ? formatTimeRange(assignment.start_time, assignment.end_time).replace(/AM|PM/g, '')
            : formatTimeRange(assignment.start_time, assignment.end_time)

          return (
            <div
              key={assignment.id}
              className={`${assignments.length === 2 ? 'flex-1' : 'flex-1'} px-1 py-0.5 rounded text-[9px] font-medium border cursor-pointer hover:opacity-80 ${colorClasses[caretakerColor as keyof typeof colorClasses] || colorClasses.blue}`}
              onClick={(e) => {
                e.stopPropagation()
                onWeekendClick(day)
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
        {assignments.length > 2 && (
          <div
            className="px-1 py-0.5 rounded text-[9px] bg-gray-100 border border-gray-300 text-gray-600 cursor-pointer hover:bg-gray-200 flex-shrink-0 min-w-[20px] text-center"
            onClick={(e) => {
              e.stopPropagation()
              onWeekendClick(day)
            }}
            title={`${assignments.length - 1} more assignments`}
          >
            +{assignments.length - 1}
          </div>
        )}
      </div>
    </div>
  )
} 