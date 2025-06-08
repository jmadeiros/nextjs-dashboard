"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { Database } from "@/types/supabase"

type Booking = Database["public"]["Tables"]["bookings"]["Row"]

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllBookings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(20)

      if (error) {
        console.error("Debug panel error:", error)
        setError(error.message)
      } else {
        console.log("Debug panel fetched bookings:", data)
        setBookings(data || [])
      }
    } catch (err) {
      console.error("Debug panel exception:", err)
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsOpen(true)
            fetchAllBookings()
          }}
          className="bg-background shadow-md"
        >
          Debug Data
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[90vw] max-w-[500px] max-h-[80vh] overflow-auto">
      <Card className="shadow-xl border-primary/20">
        <CardHeader className="bg-muted/50 py-2 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Debug Panel</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={fetchAllBookings} disabled={isLoading}>
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 text-xs">
          {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-3 border border-red-200">Error: {error}</div>}

          <div className="font-medium mb-2">Recent Bookings in Database ({bookings.length})</div>

          {bookings.length === 0 ? (
            <div className="text-muted-foreground italic">No bookings found in database</div>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => (
                <div key={booking.id} className="border rounded p-2 bg-muted/20">
                  <div className="flex justify-between">
                    <div className="font-medium">{booking.title}</div>
                    <Badge variant="outline" className="text-[10px]">
                      {booking.room_id.substring(0, 8)}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {format(parseISO(booking.start_time), "MMM d, yyyy h:mm a")} -
                    {format(parseISO(booking.end_time), "h:mm a")}
                  </div>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">
                      ID: {booking.id.substring(0, 8)}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      User: {booking.user_id.substring(0, 8)}
                    </Badge>
                    {booking.is_recurring && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-100">
                        Recurring
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
