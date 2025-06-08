"use client"

import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { NavigationProps, ViewType } from "./types"

interface CalendarNavigationProps extends NavigationProps {
  onViewChange: (view: ViewType) => void
}

export default function CalendarNavigation({
  view,
  onPrevious,
  onNext,
  onViewChange,
  getViewTitle,
}: CalendarNavigationProps) {
  return (
    <>
      {/* View Type Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold">Calendar View</h2>
          <p className="text-muted-foreground text-sm">Navigate and view bookings</p>
        </div>
        <Tabs value={view} onValueChange={(v) => onViewChange(v as ViewType)} className="mr-0 sm:mr-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Date Navigation */}
      <div className="flex justify-between items-center mb-6 bg-muted/30 p-3 rounded-md">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onPrevious} className="shadow-sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous {view}</TooltipContent>
        </Tooltip>
        <div className="font-medium text-lg">{getViewTitle()}</div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onNext} className="shadow-sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Next {view}</TooltipContent>
        </Tooltip>
      </div>
    </>
  )
} 