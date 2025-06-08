"use client"

import React from "react"
import { format } from "date-fns"
import { CalendarIcon, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DashboardHeaderProps } from "./types"

export default function DashboardHeader({
  showAllRooms,
  selectedRoom,
  lastRefreshTime,
  isLoading,
  onRefresh,
  onToday,
  onNewBooking,
}: DashboardHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Oasis Village Event Room Booking System</h1>
          <p className="text-muted-foreground mt-1">
            {showAllRooms
              ? "Viewing all rooms"
              : selectedRoom
                ? `Currently viewing: ${selectedRoom.name}`
                : "Select a room to view bookings"}
          </p>
          <div className="text-xs text-muted-foreground mt-1">
            Last updated: {format(lastRefreshTime, "h:mm:ss a")}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 ml-2 text-xs"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onToday} className="shadow-sm">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Today
          </Button>
          <Button onClick={onNewBooking} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> New Booking
          </Button>
        </div>
      </div>
    </div>
  )
} 