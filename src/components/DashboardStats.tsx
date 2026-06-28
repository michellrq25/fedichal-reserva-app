"use client";

import React from "react";
import { Activity, Sparkles, Clock, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface CourtUsage {
  canchaId: string;
  name: string;
  reservas: number;
}

interface PeakHour {
  hora: string;
  reservas: number;
}

interface WeeklyOccupancy {
  dia: string;
  reservas: number;
}

interface CategoryRentability {
  categoria: string;
  ingresos: number;
}

interface ProjectionDay {
  diaSemana: string;
  ingresos: number;
}

interface DashboardStatsProps {
  stats: {
    courtUsageData: CourtUsage[];
    peakHoursData: PeakHour[];
    weeklyOccupancyData: WeeklyOccupancy[];
    totalReservations: number;
    totalRevenue: number;
    categoryRentabilityData: CategoryRentability[];
    projectionData: ProjectionDay[];
  };
}

const COLORS = [
  "oklch(0.60 0.18 142)",  // Emerald (Primary)
  "oklch(0.65 0.14 195)",  // Cyan
  "oklch(0.55 0.18 285)",  // Indigo/Purple
  "oklch(0.70 0.15 88)",   // Lime Green
  "oklch(0.62 0.15 36)",   // Orange
  "oklch(0.52 0.13 222)",  // Blue
];

export function DashboardStats({ stats }: DashboardStatsProps) {
  const {
    courtUsageData,
    peakHoursData,
    weeklyOccupancyData,
    totalReservations,
    totalRevenue,
    categoryRentabilityData,
    projectionData,
  } = stats;

  // Derive top court
  const topCourt = [...courtUsageData].sort((a, b) => b.reservas - a.reservas)[0];

  // Derive peak hour
  const peakHourObj = [...peakHoursData].sort((a, b) => b.reservas - a.reservas)[0];
  const peakHourStr = peakHourObj && peakHourObj.reservas > 0 ? peakHourObj.hora : "N/A";

  const chartTooltipStyle = {
    backgroundColor: "oklch(0.99 0.002 245 / 95%)",
    border: "1px solid oklch(0.91 0.005 245)",
    borderRadius: "12px",
    color: "oklch(0.18 0.015 245)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
    fontSize: "12px",
    fontWeight: "bold" as const,
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards with Glassmorphism */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        {/* Metric 1: Reservas Totales */}
        <Card className="glass-panel glass-panel-hover overflow-hidden relative group rounded-2xl border-border/50 shadow-md">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Reservas Totales
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
              <Activity className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-black tracking-tight text-foreground">{totalReservations}</div>
            <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Sincronizadas con Google Calendar
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Cancha Más Solicitada */}
        <Card className="glass-panel glass-panel-hover overflow-hidden relative group rounded-2xl border-border/50 shadow-md">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-cyan-500 to-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Cancha Favorita
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-inner">
              <Sparkles className="w-4 h-4 text-cyan-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-lg font-black tracking-tight text-foreground truncate max-w-full leading-8">
              {topCourt && topCourt.reservas > 0 ? topCourt.name.replace("F7 — ", "").replace("F9 — ", "").replace("F11 — ", "") : "Ninguna"}
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              {topCourt && topCourt.reservas > 0
                ? `${topCourt.reservas} reservas registradas`
                : "Sin reservas activas"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Hora Pico */}
        <Card className="glass-panel glass-panel-hover overflow-hidden relative group rounded-2xl border-border/50 shadow-md">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 to-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Hora Pico Principal
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-inner">
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-black tracking-tight text-foreground">{peakHourStr}</div>
            <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              {peakHourObj && peakHourObj.reservas > 0
                ? `${peakHourObj.reservas} reservas en esta hora`
                : "Sin reservas cargadas"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Ingresos Estimados */}
        <Card className="glass-panel glass-panel-hover overflow-hidden relative group rounded-2xl border-border/50 shadow-md">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Ingresos Estimados
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-black tracking-tight text-foreground">
              S/. {totalRevenue.toLocaleString("es-PE")}
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Valor total acumulado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Occupancy */}
        <Card className="glass-panel rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-wide text-foreground">Ocupación Semanal</CardTitle>
            <CardDescription className="text-muted-foreground/70 text-xs">Reservas agrupadas por día de la semana</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyOccupancyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.60 0.18 142)" stopOpacity={1} />
                    <stop offset="100%" stopColor="oklch(0.70 0.15 88)" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dia" stroke="oklch(0.40 0.02 240)" fontSize={11} fontWeight="semibold" tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.40 0.02 240)" fontSize={11} fontWeight="semibold" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(0, 0, 0, 0.02)" }}
                  contentStyle={chartTooltipStyle}
                />
                <Bar dataKey="reservas" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Court Distribution (Donut Chart) */}
        <Card className="glass-panel rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-wide text-foreground">Distribución de Uso por Cancha</CardTitle>
            <CardDescription className="text-muted-foreground/70 text-xs">Proporción de reservas agrupadas por cancha</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col justify-center items-center">
            {totalReservations === 0 ? (
              <div className="text-muted-foreground text-sm font-semibold py-20">No hay reservas registradas aún.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courtUsageData.filter((d) => d.reservas > 0)}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="reservas"
                  >
                    {courtUsageData
                      .filter((d) => d.reservas > 0)
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.8)" strokeWidth={1} />
                      ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    content={({ payload }) => (
                      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-semibold mt-2">
                        {payload?.map((entry: any, index: number) => (
                          <li key={`item-${index}`} className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-foreground/90">{entry.payload.name.replace(" — Cancha ", " ")}</span>
                            <span className="text-muted-foreground/50">({entry.payload.reservas})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Rentability */}
        <Card className="glass-panel rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-wide text-foreground">Rentabilidad por Categoría</CardTitle>
            <CardDescription className="text-muted-foreground/70 text-xs">Ingresos estimados según el formato de juego</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {totalRevenue === 0 ? (
              <div className="text-muted-foreground text-sm font-semibold py-20 text-center">Sin ingresos registrados.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryRentabilityData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rentabilityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.65 0.14 195)" stopOpacity={1} />
                      <stop offset="100%" stopColor="oklch(0.60 0.18 142)" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="categoria" stroke="oklch(0.40 0.02 240)" fontSize={11} fontWeight="semibold" tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.40 0.02 240)" fontSize={11} fontWeight="semibold" tickLine={false} axisLine={false} unit=" S/." allowDecimals={false} />
                  <Tooltip cursor={{ fill: "rgba(0, 0, 0, 0.02)" }} contentStyle={chartTooltipStyle} formatter={(val) => [`S/. ${val}`, "Ingresos"]} />
                  <Bar dataKey="ingresos" fill="url(#rentabilityGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours (Area Chart) */}
        <Card className="glass-panel rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-wide text-foreground">Horas Pico Más Solicitadas</CardTitle>
            <CardDescription className="text-muted-foreground/70 text-xs">Uso de canchas por intervalo horario (16:00 a 23:00)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={peakHoursData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReservas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.55 0.18 285)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.55 0.18 285)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hora" stroke="oklch(0.40 0.02 240)" fontSize={11} fontWeight="semibold" tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.40 0.02 240)" fontSize={11} fontWeight="semibold" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="reservas"
                  stroke="oklch(0.55 0.18 285)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorReservas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Projection (Area Chart) */}
        <Card className="glass-panel rounded-2xl md:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-wide text-foreground">Proyección de Ingresos a 7 Días</CardTitle>
            <CardDescription className="text-muted-foreground/70 text-xs">Ganancias proyectadas para hoy y los próximos 6 días de reservas</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProyección" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.60 0.18 142)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="oklch(0.60 0.18 142)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="diaSemana" stroke="oklch(0.40 0.02 240)" fontSize={11} fontWeight="semibold" tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.40 0.02 240)" fontSize={11} fontWeight="semibold" tickLine={false} axisLine={false} unit=" S/." allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(val) => [`S/. ${val}`, "Ingresos"]} />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="oklch(0.60 0.18 142)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorProyección)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
