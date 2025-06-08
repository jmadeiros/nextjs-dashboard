import { createServerClient } from "@/lib/supabase-server"
import BookingDashboard from "@/components/booking-dashboard"
import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import RoomManagementTabs from "@/components/room-management-tabs"

export const revalidate = 60 // Revalidate this page every 60 seconds

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>

      <Card className="shadow-md border-primary/10">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle>Booking Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-8 w-full mb-4" />
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default async function DashboardStatsPage() {
  try {
    // Modify the data fetching to be more efficient
    const supabase = createServerClient()

    // Fetch only essential data
    const { data: rooms, error } = await supabase
      .from("rooms")
      .select("id, name, description, capacity")
      .order("name")
      .limit(10) // Limit to reduce data size

    if (error) {
      console.error("Error fetching rooms:", error)
      throw new Error(`Failed to fetch rooms: ${error.message}`)
    }

    // Provide fallback rooms if none are returned
    const fallbackRooms = [
      {
        id: "1",
        name: "Conference Room A",
        description: "Main conference room",
        capacity: 20,
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Meeting Room B",
        description: "Small meeting room",
        capacity: 8,
        created_at: new Date().toISOString(),
      },
      {
        id: "3",
        name: "Executive Suite",
        description: "Executive meeting room",
        capacity: 12,
        created_at: new Date().toISOString(),
      },
    ]

    return (
      <main className="container mx-auto px-4 py-8">
        <RoomManagementTabs />
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Oasis Village Room Dashboard</h1>
              <p className="text-muted-foreground mt-1">View booking statistics and room availability</p>
            </div>
          </div>
        </div>

        <Suspense fallback={<DashboardSkeleton />}>
          <BookingDashboard rooms={rooms || fallbackRooms} />
        </Suspense>
      </main>
    )
  } catch (error) {
    console.error("Error in Dashboard page:", error)

    // Provide fallback rooms if there's an error
    const fallbackRooms = [
      {
        id: "1",
        name: "Conference Room A",
        description: "Main conference room",
        capacity: 20,
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Meeting Room B",
        description: "Small meeting room",
        capacity: 8,
        created_at: new Date().toISOString(),
      },
      {
        id: "3",
        name: "Executive Suite",
        description: "Executive meeting room",
        capacity: 12,
        created_at: new Date().toISOString(),
      },
    ]

    return (
      <main className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load rooms. Using fallback data."}
          </AlertDescription>
        </Alert>
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Oasis Village Event Dashboard</h1>
              <p className="text-muted-foreground mt-1">View booking statistics and room availability</p>
            </div>
          </div>
        </div>
        <BookingDashboard rooms={fallbackRooms} />
      </main>
    )
  }
}
