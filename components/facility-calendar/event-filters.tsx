"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, Filter } from "lucide-react"
import type { FilterState } from "./types"

interface EventFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: Partial<FilterState>) => void
  isFilterOpen: boolean
  setIsFilterOpen: (open: boolean) => void
}

export default function EventFilters({
  filters,
  onFiltersChange,
  isFilterOpen,
  setIsFilterOpen,
}: EventFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={filters.searchQuery}
          onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
          className="pl-10"
        />
      </div>

      {/* Filter Popover */}
      <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Event Types</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="room-bookings"
                    checked={filters.showRoomBookings}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ showRoomBookings: !!checked })
                    }
                  />
                  <Label htmlFor="room-bookings" className="text-sm">
                    Room Bookings
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="contractor-visits"
                    checked={filters.showContractorVisits}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ showContractorVisits: !!checked })
                    }
                  />
                  <Label htmlFor="contractor-visits" className="text-sm">
                    Contractor Visits
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="partner-visits"
                    checked={filters.showPartnerVisits}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ showPartnerVisits: !!checked })
                    }
                  />
                  <Label htmlFor="partner-visits" className="text-sm">
                    Partner Visits
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring-events"
                    checked={filters.showRecurringEvents}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ showRecurringEvents: !!checked })
                    }
                  />
                  <Label htmlFor="recurring-events" className="text-sm">
                    Recurring Events
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 