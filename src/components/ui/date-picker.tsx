import React, { forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CustomDatePickerProps {
  selected?: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  className?: string;
  disabled?: boolean;
}

const CustomDateInput = forwardRef<HTMLButtonElement, any>(
  ({ value, onClick, placeholder, className, disabled }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      className={cn(
        "w-full justify-start text-left font-normal",
        !value && "text-muted-foreground",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {value || placeholder}
    </Button>
  )
);

CustomDateInput.displayName = "CustomDateInput";

export function CustomDatePicker({
  selected,
  onChange,
  placeholderText = "Pick a date",
  className,
  disabled = false,
}: CustomDatePickerProps) {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      dateFormat="dd/MM/yyyy"
      showYearDropdown
      showMonthDropdown
      dropdownMode="select"
      placeholderText={placeholderText}
      className={className}
      disabled={disabled}
      customInput={
        <CustomDateInput
          placeholder={placeholderText}
          className={className}
          disabled={disabled}
        />
      }
      popperClassName="z-50"
      calendarClassName="border border-border bg-background shadow-md rounded-md"
      dayClassName={(date) =>
        cn(
          "hover:bg-accent hover:text-accent-foreground rounded-md",
          date.toDateString() === new Date().toDateString() &&
            "bg-accent text-accent-foreground"
        )
      }
      weekDayClassName={() => "text-muted-foreground text-sm font-medium"}
      monthClassName={() => "text-sm font-medium"}
      yearClassName={() => "text-sm font-medium"}
    />
  );
}