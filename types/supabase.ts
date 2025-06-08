export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          name: string
          description: string | null
          capacity: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          capacity?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          capacity?: number | null
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          room_id: string
          user_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          created_at: string
          is_recurring: boolean
          recurrence_pattern: string | null
          authorizer: string | null
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          created_at?: string
          is_recurring?: boolean
          recurrence_pattern?: string | null
          authorizer?: string | null
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          created_at?: string
          is_recurring?: boolean
          recurrence_pattern?: string | null
          authorizer?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
        }
      }
      contractors: {
        Row: {
          id: string
          name: string
          company: string | null
          email: string | null
          phone: string | null
          notes: string | null
          type: "contractor" | "volunteer"
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          company?: string | null
          email?: string | null
          phone?: string | null
          notes?: string | null
          type?: "contractor" | "volunteer"
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          company?: string | null
          email?: string | null
          phone?: string | null
          notes?: string | null
          type?: "contractor" | "volunteer"
          created_at?: string
        }
      }
      contractor_visits: {
        Row: {
          id: string
          contractor_id: string
          visit_date: string
          start_time: string
          end_time: string
          purpose: string | null
          status: string
          created_at: string
          is_recurring: boolean
          recurrence_pattern: string | null
          authorizer: string | null
        }
        Insert: {
          id?: string
          contractor_id: string
          visit_date: string
          start_time: string
          end_time: string
          purpose?: string | null
          status?: string
          created_at?: string
          is_recurring?: boolean
          recurrence_pattern?: string | null
          authorizer?: string | null
        }
        Update: {
          id?: string
          contractor_id?: string
          visit_date?: string
          start_time?: string
          end_time?: string
          purpose?: string | null
          status?: string
          created_at?: string
          is_recurring?: boolean
          recurrence_pattern?: string | null
          authorizer?: string | null
        }
      }
      guests: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          created_at?: string
        }
      }
      guest_visits: {
        Row: {
          id: string
          guest_id: string | null
          partner_id: string | null
          partner_name: string | null
          visit_date: string
          start_time: string | null
          end_time: string | null
          purpose: string | null
          status: string
          created_at: string
          guest_details: string | null
          check_in_time: string | null
          check_out_time: string | null
          authorizer: string | null
          partners: {
            name: string
            company: string | null
            email: string | null
          } | null
        }
        Insert: {
          id?: string
          guest_id?: string | null
          partner_id?: string | null
          partner_name?: string | null
          visit_date: string
          start_time?: string | null
          end_time?: string | null
          purpose?: string | null
          status?: string
          created_at?: string
          guest_details?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          authorizer?: string | null
        }
        Update: {
          id?: string
          guest_id?: string | null
          partner_id?: string | null
          partner_name?: string | null
          visit_date?: string
          start_time?: string | null
          end_time?: string | null
          purpose?: string | null
          status?: string
          created_at?: string
          guest_details?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          authorizer?: string | null
        }
      }
      caretakers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          color?: string
          created_at?: string
        }
      }
      weekend_assignments: {
        Row: {
          id: string
          caretaker_id: string
          weekend_start_date: string
          start_time: string
          end_time: string
          notes: string | null
          created_at: string
          caretakers?: {
            name: string
            color: string
          } | null
        }
        Insert: {
          id?: string
          caretaker_id: string
          weekend_start_date: string
          start_time?: string
          end_time?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          caretaker_id?: string
          weekend_start_date?: string
          start_time?: string
          end_time?: string
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly"
export type DayOfWeek = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"

export interface RecurrencePattern {
  type: RecurrenceType
  interval: number
  daysOfWeek?: DayOfWeek[]
  endDate?: string
}

export type VisitStatus = "scheduled" | "checked-in" | "completed" | "cancelled"
