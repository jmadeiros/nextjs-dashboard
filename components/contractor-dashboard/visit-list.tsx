"use client"

import React from "react"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Clock, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Contractor, ContractorVisit } from "./types"

interface VisitListProps {
  visits: ContractorVisit[]
  contractors: Contractor[]
  isLoading: boolean
  searchQuery: string
  onEditVisit: (visit: ContractorVisit) => void
  onDeleteVisit: (visit: ContractorVisit) => void
}

export default function VisitList({
  visits,
  contractors,
  isLoading,
  searchQuery,
  onEditVisit,
  onDeleteVisit,
}: VisitListProps) {
  const getContractorName = (contractorId: string) => {
    const contractor = contractors.find((c) => c.id === contractorId)
    return contractor ? contractor.name : "Unknown Contractor"
  }

  const getContractorType = (contractorId: string) => {
    const contractor = contractors.find((c) => c.id === contractorId)
    return contractor?.type || "contractor"
  }

  // Filter visits based on search query
  const filteredVisits = visits.filter((visit) => {
    const contractorName = getContractorName(visit.contractor_id).toLowerCase()
    return contractorName.includes(searchQuery.toLowerCase())
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-4 w-64" />
            </div>
          ))}
      </div>
    )
  }

  if (filteredVisits.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-muted/20 rounded-lg border border-dashed border-muted">
        <User className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <h3 className="text-base font-medium mb-1">
          {searchQuery ? "No matching visits found" : "No visits scheduled"}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          {searchQuery 
            ? "Try adjusting your search terms"
            : "Start by creating your first contractor or volunteer visit"
          }
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filteredVisits.map((visit) => {
        const contractor = contractors.find((c) => c.id === visit.contractor_id)
        const contractorName = getContractorName(visit.contractor_id)
        const contractorType = getContractorType(visit.contractor_id)
        const isVolunteer = contractorType === "volunteer"

        return (
          <div
            key={visit.id}
            className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
              isVolunteer
                ? "border-green-200 bg-green-50/50"
                : "border-orange-200 bg-orange-50/50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{contractorName}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      isVolunteer
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-orange-100 text-orange-800 border border-orange-200"
                    }`}
                  >
                    {isVolunteer ? "Volunteer" : "Contractor"}
                  </span>
                  {visit.is_recurring && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-medium">
                      Recurring
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      {format(parseISO(visit.visit_date), "EEEE, MMMM d, yyyy")}
                    </span>
                    <span>•</span>
                    <span>
                      {visit.start_time} - {visit.end_time}
                    </span>
                  </div>

                  {contractor?.company && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{contractor.company}</span>
                    </div>
                  )}

                  {visit.purpose && (
                    <div className="mt-2">
                      <span className="font-medium">Purpose:</span> {visit.purpose}
                    </div>
                  )}

                  {visit.authorizer && (
                    <div>
                      <span className="font-medium">Authorized by:</span> {visit.authorizer}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditVisit(visit)}
                  className="hover:bg-primary/10"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeleteVisit(visit)}
                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
} 