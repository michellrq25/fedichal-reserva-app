"use client";

import * as React from "react";
import { useState, useEffect, startTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarGrid } from "@/components/CalendarGrid";
import { DashboardStats } from "@/components/DashboardStats";
import { getReservations, getDashboardStats } from "@/app/actions/reservations";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ReservationDialog } from "@/components/ReservationDialog";
import { Trophy, Plus, Calendar, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

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

export default function Home() {
  const [activeTab, setActiveTab] = useState<"calendar" | "dashboard">("calendar");
  const [selectedDate, setSelectedDate] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize date to today's date in local time YYYY-MM-DD
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const fetchData = React.useCallback(async () => {
    if (!selectedDate) return;
    setIsLoading(true);
    try {
      const [resList, statsData] = await Promise.all([
        getReservations(selectedDate),
        getDashboardStats(),
      ]);
      setReservations(resList as any);
      setStats(statsData);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al cargar los datos del complejo.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  // Load data when date changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-8 space-y-5 select-none">
      {/* Premium Floating Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/40 backdrop-blur-xl border border-border/50 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-emerald-400 to-accent" />
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white border border-border/80 shadow-sm overflow-hidden relative p-0.5 shrink-0 flex items-center justify-center">
              <img src="/logo.jpg" alt="Logo Fedichal" className="object-contain w-full h-full rounded-xl" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground flex items-center gap-1.5">
              Fedichal <span className="text-primary font-light">Complejo Deportivo</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-semibold pl-[76px] flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>Panel Administrativo — Conectado a Google Calendar en tiempo real</span>
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto pl-[76px] md:pl-0">
          <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
            <DialogTrigger render={
              <Button className="w-full md:w-auto bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground font-extrabold hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 rounded-xl px-5 py-5 text-xs tracking-wider uppercase flex items-center gap-2 cursor-pointer border-none">
                <Plus className="w-4 h-4 stroke-[3px]" /> Nueva Reserva
              </Button>
            } />
            <ReservationDialog
              defaultDate={selectedDate}
              onClose={() => setIsNewBookingOpen(false)}
              onSuccess={fetchData}
            />
          </Dialog>
        </div>
      </header>

      {/* Navigation Tabs (Premium segmented design) */}
      <div className="flex bg-secondary/40 p-1.5 rounded-2xl border border-border/40 max-w-md shadow-xl">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex-1 py-3 px-5 rounded-xl font-extrabold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] ${activeTab === "calendar"
              ? "bg-card/90 text-primary border border-border/60 shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/20 border border-transparent"
            }`}
        >
          <Calendar className="w-4 h-4" /> Calendario
        </button>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex-1 py-3 px-5 rounded-xl font-extrabold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] ${activeTab === "dashboard"
              ? "bg-card/90 text-primary border border-border/60 shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/20 border border-transparent"
            }`}
        >
          <TrendingUp className="w-4 h-4" /> Informes
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "calendar" ? (
        <div className="space-y-4">
          {/* Calendar Controls with premium styling */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-card/30 backdrop-blur-md p-4 rounded-2xl border border-border/50 shadow-xl">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevDay}
                className="border-border/80 hover:bg-secondary/50 active:scale-95 transition-all text-sm font-extrabold rounded-xl cursor-pointer flex items-center gap-1 h-10 px-4"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="border-border/80 hover:bg-secondary/50 active:scale-95 transition-all text-sm font-extrabold rounded-xl px-5 cursor-pointer h-10"
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextDay}
                className="border-border/80 hover:bg-secondary/50 active:scale-95 transition-all text-sm font-extrabold rounded-xl cursor-pointer flex items-center gap-1 h-10 px-4"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 bg-secondary/20 px-4 py-2.5 rounded-xl border border-border/30">
              <label htmlFor="calendar-date" className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Fecha
              </label>
              <input
                id="calendar-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-foreground text-sm outline-none font-bold focus:ring-0 w-[140px] cursor-pointer"
              />
            </div>
          </div>

          {/* Scheduler View */}
          {isLoading ? (
            <Card className="p-20 flex flex-col items-center justify-center border-border/40 bg-card/25 backdrop-blur-md rounded-2xl shadow-xl">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground text-sm mt-5 font-semibold tracking-wide">Cargando disponibilidad...</p>
            </Card>
          ) : (
            <CalendarGrid
              reservations={reservations}
              selectedDate={selectedDate}
              onRefresh={fetchData}
            />
          )}
        </div>
      ) : (
        /* Reports View */
        <div>
          {isLoading || !stats ? (
            <Card className="p-20 flex flex-col items-center justify-center border-border/40 bg-card/25 backdrop-blur-md rounded-2xl shadow-xl">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground text-sm mt-5 font-semibold tracking-wide">Generando informes...</p>
            </Card>
          ) : (
            <DashboardStats stats={stats} />
          )}
        </div>
      )}
    </div>
  );
}
