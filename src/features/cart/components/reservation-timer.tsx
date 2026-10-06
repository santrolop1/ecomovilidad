"use client";

import { Clock } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { formatCountdown, secondsLeft } from "../lib/reservation";

interface ReservationTimerProps {
  until: string;
  /** Se invoca una vez al llegar a 0: el contenedor consulta al servidor. */
  onExpire?: () => void;
  className?: string;
}

/** "Reservado durante 14:32". Solo visual: la autoridad es el servidor. */
export function ReservationTimer({ until, onExpire, className }: ReservationTimerProps) {
  const now = useNow();
  const left = secondsLeft(until, now);
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
  }, [until]);

  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      onExpire?.();
    }
  }, [left, onExpire]);

  const urgent = left > 0 && left <= 120;
  return (
    <p
      className={cn(
        "tabular inline-flex items-center gap-1.5 text-sm",
        left === 0 ? "text-destructive" : urgent ? "text-warning" : "text-muted-foreground",
        className,
      )}
    >
      <Clock className="size-4" aria-hidden="true" />
      {left === 0 ? (
        "Reserva vencida"
      ) : (
        <>
          Reservado durante <span className="font-semibold">{formatCountdown(left)}</span>
          <span className="sr-only"> minutos</span>
        </>
      )}
    </p>
  );
}
