"use client"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { getViewTitle } from "@/lib/utils/calendar-utils"
import type { ViewType } from "@/hooks/use-calendar-navigation"

interface CalendarHeaderProps {
  currentDate: Date
  view: ViewType
  onViewChange: (view: ViewType) => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

export default function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <h2 className="text-2xl font-bold text-primary">
          {getViewTitle(currentDate, view)}
        </h2>
        
        <Button variant="outline" size="sm" onClick={onToday}>
          <CalendarIcon className="h-4 w-4 mr-1" />
          Today
        </Button>
      </div>

      <Tabs value={view} onValueChange={(value) => onViewChange(value as ViewType)} className="w-auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
} 