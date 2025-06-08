import ContractorDashboard from "@/components/contractor-dashboard"
import { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"

async function getRooms() {
  const supabase = getSupabaseClient()
  const { data: rooms, error } = await supabase.from("rooms").select("*").order("name")

  if (error) {
    console.error("Error fetching rooms:", error)
    return []
  }

  return rooms || []
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>

      <Card className="shadow-md border-primary/10">
        <CardContent className="p-4">
          <Skeleton className="h-8 w-full mb-4" />
          <div className="grid grid-cols-7 gap-2">
            {Array(31)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function ContractorsPage() {
  try {
    // Use a default user ID for all contractor visits
    const defaultUserId = "00000000-0000-0000-0000-000000000000"

    // Fetch rooms data
    const rooms = await getRooms()

    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Contractors & Volunteers</h1>
          <p className="text-gray-600 mt-2">Manage contractor visits and volunteer schedules</p>
        </div>
        <Suspense fallback={<DashboardSkeleton />}>
          <ContractorDashboard userId={defaultUserId} rooms={rooms} />
        </Suspense>
      </main>
    )
  } catch (error) {
    console.error("Error in Contractors page:", error)

    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Contractors & Volunteers</h1>
          <p className="text-gray-600 mt-2">Manage contractor visits and volunteer schedules</p>
        </div>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load contractor dashboard."}
          </AlertDescription>
        </Alert>
        <DashboardSkeleton />
      </main>
    )
  }
}
