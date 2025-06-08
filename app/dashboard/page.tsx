import { createServerClient } from "@/lib/supabase-server"
import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Dashboard from "@/components/dashboard"
import RoomManagementTabs from "@/components/room-management-tabs"

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
          <CardTitle>Room Calendar</CardTitle>
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

export default async function DashboardPage() {
  try {
    const supabase = createServerClient()

    // Fetch rooms with a timeout to prevent hanging
    const fetchRoomsPromise = supabase.from("rooms").select("*").order("name")

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Fetch rooms timeout")), 5000)
    })

    // Race the fetch against the timeout
    const { data: rooms, error } = (await Promise.race([fetchRoomsPromise, timeoutPromise])) as any

    if (error) {
      console.error("Error fetching rooms:", error)
      throw new Error(`Failed to fetch rooms: ${error.message}`)
    }

    // Get user ID (or use a placeholder for now)
    const userId = "current-user"

    return (
      <main className="container mx-auto px-4 py-8">
        <RoomManagementTabs />
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard rooms={rooms || []} userId={userId} />
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

    // Get user ID (or use a placeholder for now)
    const userId = "current-user"

    return (
      <main className="container mx-auto px-4 py-8">
        <RoomManagementTabs />
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load rooms. Using fallback data."}
          </AlertDescription>
        </Alert>
        <Dashboard rooms={fallbackRooms} userId={userId} />
      </main>
    )
  }
}
