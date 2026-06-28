"use client";

import * as React from "react";
import { useState } from "react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ReservationDialog } from "@/components/ReservationDialog";
import { Card } from "@/components/ui/card";
import { Plus, Phone, Clock, Lock, User } from "lucide-react";

interface Reservation {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  canchaId: string;
  fecha: Date | string;
  horaInicio: string;
  horaFin: string;
  googleEventId?: string | null;
}

interface CalendarGridProps {
  reservations: Reservation[];
  selectedDate: string; // YYYY-MM-DD
  onRefresh: () => void;
}

const COURTS = [
  { id: "F7_1", name: "F7 — Cancha 1", color: "border-emerald-500/20 bg-emerald-50/30 text-emerald-800 shadow-sm shadow-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-50/50" },
  { id: "F7_2", name: "F7 — Cancha 2", color: "border-emerald-500/20 bg-emerald-50/30 text-emerald-800 shadow-sm shadow-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-50/50" },
  { id: "F7_3", name: "F7 — Cancha 3", color: "border-emerald-500/20 bg-emerald-50/30 text-emerald-800 shadow-sm shadow-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-50/50" },
  { id: "F7_4", name: "F7 — Cancha 4", color: "border-emerald-500/20 bg-emerald-50/30 text-emerald-800 shadow-sm shadow-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-50/50" },
  { id: "F9_A", name: "F9 — Cancha A", color: "border-cyan-500/20 bg-cyan-50/30 text-cyan-800 shadow-sm shadow-cyan-500/5 hover:border-cyan-500/40 hover:bg-cyan-50/50" },
  { id: "F9_B", name: "F9 — Cancha B", color: "border-cyan-500/20 bg-cyan-50/30 text-cyan-800 shadow-sm shadow-cyan-500/5 hover:border-cyan-500/40 hover:bg-cyan-50/50" },
  { id: "F11_Única", name: "F11 — Cancha Única", color: "border-purple-500/20 bg-purple-50/30 text-purple-800 shadow-sm shadow-purple-500/5 hover:border-purple-500/40 hover:bg-purple-50/50" },
];

const HOURS = Array.from({ length: 8 }, (_, i) => {
  const h = i + 16;
  return `${String(h).padStart(2, "0")}:00`;
});

// Static overlap map for frontend calculations
const COURT_OVERLAPS: Record<string, string[]> = {
  F7_1: ["F9_A", "F11_Única"],
  F7_2: ["F9_A", "F11_Única"],
  F7_3: ["F9_B", "F11_Única"],
  F7_4: ["F9_B", "F11_Única"],
  F9_A: ["F7_1", "F7_2", "F11_Única"],
  F9_B: ["F7_3", "F7_4", "F11_Única"],
  F11_Única: ["F7_1", "F7_2", "F7_3", "F7_4", "F9_A", "F9_B"],
};

export function CalendarGrid({ reservations, selectedDate, onRefresh }: CalendarGridProps) {
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultCanchaId, setDefaultCanchaId] = useState("");
  const [defaultStartHour, setDefaultStartHour] = useState("");

  const handleCellClick = (canchaId: string, hour: string) => {
    setActiveReservation(null);
    setDefaultCanchaId(canchaId);
    setDefaultStartHour(hour);
    setDialogOpen(true);
  };

  const handleBookingClick = (reservation: Reservation) => {
    setActiveReservation(reservation);
    setDialogOpen(true);
  };

  const isHourCoveredByBooking = (booking: Reservation, hourStr: string) => {
    const bookingStart = booking.horaInicio;
    const bookingEnd = booking.horaFin;
    return hourStr >= bookingStart && hourStr < bookingEnd;
  };

  const getBookingStyle = (canchaId: string) => {
    if (canchaId.startsWith("F7_")) {
      return {
        border: "border-l-4 border-l-emerald-600 border-t-emerald-100 border-r-emerald-100 border-b-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800",
        badge: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
        indicator: "text-emerald-600"
      };
    } else if (canchaId.startsWith("F9_")) {
      return {
        border: "border-l-4 border-l-sky-600 border-t-sky-100 border-r-sky-100 border-b-sky-100 bg-sky-50/50 hover:bg-sky-50 text-sky-800",
        badge: "bg-sky-500/10 text-sky-600 border border-sky-500/20",
        indicator: "text-sky-600"
      };
    } else {
      return {
        border: "border-l-4 border-l-indigo-600 border-t-indigo-100 border-r-indigo-100 border-b-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-800",
        badge: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
        indicator: "text-indigo-600"
      };
    }
  };

  return (
    <Card className="p-6 border-border/50 bg-card/40 backdrop-blur-xl overflow-x-auto shadow-2xl rounded-2xl relative">
      <div className="min-w-[1000px] select-none">
        {/* Table Header */}
        <div className="grid grid-cols-8 gap-4 border-b border-border/35 pb-4 mb-4 font-extrabold">
          <div className="text-foreground/80 flex items-center justify-center font-black uppercase tracking-wider text-[11px]">
            Hora
          </div>
          {COURTS.map((court) => (
            <div
              key={court.id}
              className={`p-2 rounded-xl border text-center font-black tracking-normal whitespace-nowrap text-[11px] md:text-xs transition-all duration-300 ${court.color}`}
            >
              {court.name}
            </div>
          ))}
        </div>

        {/* Table Rows */}
        <div className="space-y-2.5">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-4 items-stretch min-h-[60px]">
              {/* Hour Column */}
              <div className="flex items-center justify-center text-foreground/90 font-mono text-sm border-r border-border/25 pr-4 font-black tracking-wider">
                {hour}
              </div>

              {/* Court Columns */}
              {COURTS.map((court) => {
                const directBooking = reservations.find(
                  (r) => r.canchaId === court.id && isHourCoveredByBooking(r, hour)
                );

                if (directBooking) {
                  const style = getBookingStyle(directBooking.canchaId);

                  return (
                    <div
                      key={court.id}
                      onClick={() => handleBookingClick(directBooking)}
                      className={`rounded-xl border shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer p-2 flex flex-col justify-between overflow-hidden group hover:scale-[1.01] active:scale-[0.99] ${style.border}`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-xs tracking-wide truncate text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                          <User className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                          <span className="truncate">{directBooking.clienteNombre}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground/70 font-semibold truncate flex items-center gap-1">
                          <Phone className={`w-2.5 h-2.5 ${style.indicator} shrink-0`} />
                          <span className="truncate">{directBooking.clienteTelefono}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-border/10">
                        <span className="text-[9px] font-mono font-bold bg-secondary/80 border border-border/40 px-1.5 py-0.5 rounded text-foreground shadow-sm flex items-center gap-1 shrink-0">
                          <Clock className="w-2.5 h-2.5 text-muted-foreground/60" />
                          {directBooking.horaInicio} - {directBooking.horaFin}
                        </span>
                        {directBooking.googleEventId ? (
                          <span className="w-5 h-5 text-[9px] bg-sky-500/10 text-sky-500 border border-sky-500/25 rounded-full font-extrabold flex items-center justify-center shrink-0 shadow-sm" title="Sincronizado con Google Calendar">
                            G
                          </span>
                        ) : (
                          <span className="w-5 h-5 text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/25 rounded-full font-extrabold flex items-center justify-center shrink-0 shadow-sm" title="Reserva Local">
                            L
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                const overlappingCourts = COURT_OVERLAPS[court.id] || [];
                const blockBooking = reservations.find(
                  (r) => overlappingCourts.includes(r.canchaId) && isHourCoveredByBooking(r, hour)
                );

                if (blockBooking) {
                  return (
                    <div
                      key={court.id}
                      className="rounded-xl border border-dashed border-border/20 bg-secondary/5 flex items-center justify-center p-2 select-none relative group overflow-hidden"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(45deg, rgba(255,255,255,0.005) 0px, rgba(255,255,255,0.005) 2px, transparent 2px, transparent 10px)",
                      }}
                    >
                      <div className="text-center space-y-0.5">
                        <div className="flex justify-center items-center gap-1 text-[9px] text-muted-foreground/30 font-bold uppercase tracking-wider">
                          <Lock className="w-2.5 h-2.5 text-muted-foreground/20 shrink-0" />
                          <span>Bloqueado</span>
                        </div>
                        <div className="text-[8px] text-muted-foreground/20 font-semibold truncate max-w-[100px]">
                          Cancha {blockBooking.canchaId}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={court.id}
                    onClick={() => handleCellClick(court.id, hour)}
                    className="rounded-xl border border-dashed border-border/10 hover:border-primary/20 hover:bg-primary/5 transition-all duration-300 cursor-pointer flex items-center justify-center p-2 group active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ReservationDialog
          reservation={activeReservation}
          defaultDate={selectedDate}
          defaultCanchaId={defaultCanchaId}
          defaultStartHour={defaultStartHour}
          onClose={() => setDialogOpen(false)}
          onSuccess={onRefresh}
        />
      </Dialog>
    </Card>
  );
}
