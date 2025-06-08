import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function CalendarSkeleton() {
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>

      <Card className="shadow-md border-primary/10">
        <CardContent className="p-4">
          <Skeleton className="h-8 w-full mb-4" />
          <div className="grid grid-cols-7 gap-2">
            {Array(35)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 