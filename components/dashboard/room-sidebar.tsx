"use client"

import React from "react"
import { Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import RoomSelector from "@/components/room-selector"
import type { RoomSidebarProps } from "./types"

export default function RoomSidebar({
  rooms,
  selectedRoom,
  showAllRooms,
  onRoomChange,
  onShowAllRooms,
}: RoomSidebarProps) {
  return (
    <Card className="shadow-md border-primary/10 h-full">
      <CardHeader className="bg-muted/50 border-b">
        <CardTitle>Rooms</CardTitle>
        <CardDescription>Select a room to view bookings</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-3">
          <Button
            variant={showAllRooms ? "default" : "outline"}
            className="w-full justify-start mb-3"
            onClick={onShowAllRooms}
          >
            <Palette className="mr-2 h-4 w-4 text-primary" />
            <span>View All Rooms</span>
          </Button>
        </div>
        <RoomSelector
          rooms={rooms}
          selectedRoom={selectedRoom}
          onRoomChange={onRoomChange}
          showColors={true}
        />
      </CardContent>
    </Card>
  )
} 