import { getSupabaseClient } from "@/lib/supabase-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import ClientFacilityCalendar from "@/components/client-facility-calendar"

async function getRooms() {
  const supabase = getSupabaseClient()
  const { data: rooms, error } = await supabase.from("rooms").select("*").order("name")

  if (error) {
    console.error("Error fetching rooms:", error)
    return []
  }

  return rooms || []
}

export default async function HomePage() {
  const rooms = await getRooms()
  const userId = "current-user" // This would come from auth in a real app

  return (
    <div className="min-h-screen bg-background">
      {rooms.length > 0 ? (
        <ClientFacilityCalendar rooms={rooms} userId={userId} />
      ) : (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>Failed to load rooms. Using fallback data.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
