"use client"

import React from "react"
import { format, isBefore, isToday, startOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CalendarIcon, RefreshCw } from "lucide-react"
import type { BookingFormData, DayOption, RecurrenceType, DayOfWeek } from "./types"

interface RecurringOptionsProps {
  formData: BookingFormData
  daysOfWeek: DayOption[]
  onFormDataChange: (updates: Partial<BookingFormData>) => void
  onRecurringToggle: (checked: boolean) => void
  onDayOfWeekToggle: (day: DayOfWeek, checked: boolean) => void
}

export default function RecurringOptions({
  formData,
  daysOfWeek,
  onFormDataChange,
  onRecurringToggle,
  onDayOfWeekToggle,
}: RecurringOptionsProps) {
  const today = startOfDay(new Date())

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isRecurring"
          checked={formData.isRecurring}
          onCheckedChange={onRecurringToggle}
        />
        <Label htmlFor="isRecurring" className="font-medium cursor-pointer">
          Recurring Booking
        </Label>
      </div>

      {formData.isRecurring && (
        <div className="space-y-3 pl-4 border-l-2 border-muted">
          {/* Recurrence Pattern */}
          <div className="grid gap-1">
            <Label className="font-medium text-sm">Recurrence Pattern</Label>
            <RadioGroup
              value={formData.recurrenceType}
              onValueChange={(value) => onFormDataChange({ recurrenceType: value as RecurrenceType })}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="cursor-pointer text-sm">
                  Daily
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="cursor-pointer text-sm">
                  Weekly
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="cursor-pointer text-sm">
                  Monthly
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Repeat Interval */}
          <div className="grid gap-1">
            <Label className="font-medium text-sm">Repeat every</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min="1"
                max="12"
                value={formData.recurrenceInterval}
                onChange={(e) => onFormDataChange({ recurrenceInterval: Number.parseInt(e.target.value) || 1 })}
                className="w-16 h-8"
              />
              <span className="text-sm">
                {formData.recurrenceType === "daily" 
                  ? "days" 
                  : formData.recurrenceType === "weekly" 
                    ? "weeks" 
                    : "months"
                }
              </span>
            </div>
          </div>

          {/* Weekly Days Selection */}
          {formData.recurrenceType === "weekly" && (
            <div className="grid gap-2">
              <Label className="font-medium text-sm">On these days</Label>
              <div className="grid grid-cols-7 gap-2 mt-1 bg-muted/20 p-2 rounded-md">
                {daysOfWeek.map((day) => (
                  <div key={day.value} className="flex flex-col items-center">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={formData.selectedDaysOfWeek.includes(day.value)}
                      onCheckedChange={(checked) => onDayOfWeekToggle(day.value, !!checked)}
                      className="mb-1"
                    />
                    <Label htmlFor={`day-${day.value}`} className="text-xs cursor-pointer font-medium">
                      {day.label.substring(0, 3)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* End Date */}
          <div className="grid gap-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasEndDate"
                checked={formData.showRecurrenceEndDate}
                onCheckedChange={(checked) => onFormDataChange({ showRecurrenceEndDate: !!checked })}
              />
              <Label htmlFor="hasEndDate" className="font-medium text-sm cursor-pointer">
                End date
              </Label>
            </div>

            {formData.showRecurrenceEndDate && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal h-8 mt-1 text-sm">
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {formData.recurrenceEndDate ? format(formData.recurrenceEndDate, "PPP") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.recurrenceEndDate}
                    onSelect={(newDate) => newDate && onFormDataChange({ recurrenceEndDate: newDate })}
                    disabled={(date) => isBefore(date, today) && !isToday(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Recurrence Summary */}
          {formData.isRecurring && (
            <div className="flex items-center text-xs text-muted-foreground bg-muted/30 p-1.5 rounded">
              <RefreshCw className="h-3 w-3 mr-1.5 text-primary/70" />
              {formData.recurrenceType === "daily" &&
                `Repeats daily${formData.recurrenceInterval > 1 ? ` every ${formData.recurrenceInterval} days` : ""}`}
              {formData.recurrenceType === "weekly" &&
                `Repeats weekly${formData.recurrenceInterval > 1 ? ` every ${formData.recurrenceInterval} weeks` : ""}${
                  formData.selectedDaysOfWeek.length > 0 
                    ? ` on ${formData.selectedDaysOfWeek.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}` 
                    : ""
                }`}
              {formData.recurrenceType === "monthly" &&
                `Repeats monthly${formData.recurrenceInterval > 1 ? ` every ${formData.recurrenceInterval} months` : ""}`}
              {formData.showRecurrenceEndDate && formData.recurrenceEndDate
                ? ` until ${format(formData.recurrenceEndDate, "MMMM d, yyyy")}`
                : ""}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 