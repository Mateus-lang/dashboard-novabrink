"use client";

import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DateRangeFilterProps = {
  periodo: DateRange | undefined;
  onPeriodoChange: (periodo: DateRange | undefined) => void;
};

export function DateRangeFilter({
  periodo,
  onPeriodoChange,
}: DateRangeFilterProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
          !periodo && "text-muted-foreground",
        )}
      >
        <CalendarIcon className="h-4 w-4" />
        {periodo?.from ? (
          periodo.to ? (
            <>
              {format(periodo.from, "dd 'de' MMM", {
                locale: ptBR,
              })}{" "}
              —{" "}
              {format(periodo.to, "dd 'de' MMM, yyyy", {
                locale: ptBR,
              })}
            </>
          ) : (
            format(periodo.from, "dd 'de' MMM, yyyy", {
              locale: ptBR,
            })
          )
        ) : (
          <span>Selecione o período</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={periodo}
          onSelect={onPeriodoChange}
          numberOfMonths={2}
          locale={ptBR}
          defaultMonth={periodo?.from}
        />
      </PopoverContent>
    </Popover>
  );
}
