export const roomColors = [
  {
    bg: "bg-blue-100",
    border: "border-blue-300",
    text: "text-blue-700",
    hover: "hover:bg-blue-200",
    light: "bg-blue-50",
  },
  {
    bg: "bg-purple-100",
    border: "border-purple-300",
    text: "text-purple-700",
    hover: "hover:bg-purple-200",
    light: "bg-purple-50",
  },
  {
    bg: "bg-pink-100",
    border: "border-pink-300",
    text: "text-pink-700",
    hover: "hover:bg-pink-200",
    light: "bg-pink-50",
  },
  {
    bg: "bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-700",
    hover: "hover:bg-amber-200",
    light: "bg-amber-50",
  },
  {
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    text: "text-emerald-700",
    hover: "hover:bg-emerald-200",
    light: "bg-emerald-50",
  },
  {
    bg: "bg-cyan-100",
    border: "border-cyan-300",
    text: "text-cyan-700",
    hover: "hover:bg-cyan-200",
    light: "bg-cyan-50",
  },
  {
    bg: "bg-indigo-100",
    border: "border-indigo-300",
    text: "text-indigo-700",
    hover: "hover:bg-indigo-200",
    light: "bg-indigo-50",
  },
  {
    bg: "bg-rose-100",
    border: "border-rose-300",
    text: "text-rose-700",
    hover: "hover:bg-rose-200",
    light: "bg-rose-50",
  },
  {
    bg: "bg-lime-100",
    border: "border-lime-300",
    text: "text-lime-700",
    hover: "hover:bg-lime-200",
    light: "bg-lime-50",
  },
  {
    bg: "bg-orange-100",
    border: "border-orange-300",
    text: "text-orange-700",
    hover: "hover:bg-orange-200",
    light: "bg-orange-50",
  },
]

// Function to get color for a room based on its index
export function getRoomColor(roomId: string, rooms: any[]) {
  const roomIndex = rooms.findIndex((room) => room.id === roomId)
  if (roomIndex === -1) return roomColors[0]
  return roomColors[roomIndex % roomColors.length]
}

// Function to get color for recurring bookings
export function getRecurringColor() {
  return {
    bg: "bg-green-100",
    border: "border-green-300",
    text: "text-green-700",
    hover: "hover:bg-green-200",
    light: "bg-green-50",
  }
}
