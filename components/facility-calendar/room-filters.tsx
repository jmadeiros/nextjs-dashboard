"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Room } from "./types"

interface RoomFiltersProps {
  rooms: Room[]
  selectedRooms: string[]
  onRoomToggle: (roomId: string) => void
}

export default function RoomFilters({ rooms, selectedRooms, onRoomToggle }: RoomFiltersProps) {
  const allSelected = selectedRooms.length === rooms.length
  const noneSelected = selectedRooms.length === 0

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all
      selectedRooms.forEach((roomId) => onRoomToggle(roomId))
    } else {
      // Select all
      rooms.forEach((room) => {
        if (!selectedRooms.includes(room.id)) {
          onRoomToggle(room.id)
        }
      })
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Room Filters</CardTitle>
            <CardDescription>
              {noneSelected 
                ? "No rooms selected (showing all)" 
                : selectedRooms.length === 1 
                ? "1 room selected" 
                : `${selectedRooms.length} rooms selected`
              }
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center space-x-2">
              <Checkbox
                id={`room-${room.id}`}
                checked={selectedRooms.includes(room.id)}
                onCheckedChange={() => onRoomToggle(room.id)}
              />
              <Label
                htmlFor={`room-${room.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {room.name}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 