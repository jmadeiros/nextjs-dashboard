"use client"

import React from "react"
import { format, parseISO, isSameDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, CalendarIcon, Clock, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Partner, EnhancedGuestVisit } from "./types"

interface VisitListProps {
  visits: EnhancedGuestVisit[]
  isLoading: boolean
  searchQuery: string
  onDeleteVisit: (visit: EnhancedGuestVisit) => void
}

export default function VisitList({
  visits,
  isLoading,
  searchQuery,
  onDeleteVisit,
}: VisitListProps) {
  // Filter visits based on search query
  const filteredVisits = visits.filter((visit) => {
    const partnerName = (visit.partners?.name || "Unknown Partner").toLowerCase()
    const guestDetails = (visit.guest_details || "").toLowerCase()
    const purpose = (visit.purpose || "").toLowerCase()
    const query = searchQuery.toLowerCase()
    
    return partnerName.includes(query) || guestDetails.includes(query) || purpose.includes(query)
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
      </div>
    )
  }

  if (filteredVisits.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-muted/20 rounded-lg border border-dashed border-muted">
        <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <h3 className="text-base font-medium mb-1">
          {searchQuery ? "No matching visits found" : "No partner visits scheduled"}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          {searchQuery 
            ? "Try adjusting your search terms"
            : "Start by scheduling your first partner guest visit"
          }
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filteredVisits.map((visit) => {
        const visitDate = parseISO(visit.visit_date)
        const isUpcoming = isSameDay(visitDate, new Date()) || visitDate > new Date()

        return (
          <Card
            key={visit.id}
            className={`overflow-hidden ${isUpcoming ? "border-purple-300" : "border-gray-200"}`}
          >
            <CardContent className="p-0">
              <div
                className={`border-l-4 p-4 ${
                  isUpcoming ? "border-purple-400 bg-purple-50" : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-lg">{visit.partners?.name || "Unknown Partner"}</h3>
                      <div
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          visit.status === "scheduled"
                            ? "bg-purple-100 text-purple-700"
                            : visit.status === "checked-in"
                              ? "bg-green-100 text-green-700"
                              : visit.status === "completed"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-red-100 text-red-700"
                        }`}
                      >
                        {visit.status ? visit.status.charAt(0).toUpperCase() + visit.status.slice(1) : "Unknown"}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary/70" />
                        <span className="font-medium">
                          {format(visitDate, "EEEE, MMMM d, yyyy")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary/70" />
                        <span className="font-medium">
                          {visit.start_time === "08:00" && visit.end_time === "18:00"
                            ? "Full Day"
                            : `${visit.start_time} - ${visit.end_time}`}
                        </span>
                      </div>

                      {visit.purpose && (
                        <div className="mt-2">
                          <span className="font-medium">Purpose:</span> {visit.purpose}
                        </div>
                      )}

                      {visit.guest_details && (
                        <div className="mt-2">
                          <span className="font-medium">Guests:</span> {visit.guest_details}
                        </div>
                      )}

                      {visit.authorizer && (
                        <div className="mt-2">
                          <span className="font-medium">Authorized by:</span> {visit.authorizer}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => onDeleteVisit(visit)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>

                    {visit.status === "scheduled" && isUpcoming && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        Check In
                      </Button>
                    )}

                    {visit.status === "checked-in" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
} 