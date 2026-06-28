"use server";

import { prisma } from "@/lib/db";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/googleCalendar";
import { revalidatePath } from "next/cache";

// Helper to normalize dates to 00:00:00 UTC of the given date to ensure consistency.
function normalizeDateToUTC(dateInput: Date | string): Date {
  if (typeof dateInput === "string" && dateInput.includes("-")) {
    const parts = dateInput.split("T")[0].split("-");
    const yyyy = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10) - 1;
    const dd = parseInt(parts[2], 10);
    return new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0, 0));
  }
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export interface ReservationInput {
  clienteNombre: string;
  clienteTelefono: string;
  canchaId: string;
  fecha: string; // ISO String or YYYY-MM-DD
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
}

export async function getCourts() {
  try {
    return await prisma.court.findMany({
      orderBy: { id: "asc" },
    });
  } catch (error) {
    console.error("Error fetching courts:", error);
    return [];
  }
}

export async function getReservations(fechaStr?: string) {
  try {
    const filterDate = fechaStr ? normalizeDateToUTC(fechaStr) : normalizeDateToUTC(new Date());
    return await prisma.reservation.findMany({
      where: {
        fecha: filterDate,
      },
      include: {
        court: true,
      },
      orderBy: {
        horaInicio: "asc",
      },
    });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return [];
  }
}

export async function createReservation(input: ReservationInput) {
  const { clienteNombre, clienteTelefono, canchaId, fecha, horaInicio, horaFin } = input;

  if (!clienteNombre || !clienteTelefono || !canchaId || !fecha || !horaInicio || !horaFin) {
    throw new Error("Todos los campos son requeridos.");
  }

  if (horaInicio >= horaFin) {
    throw new Error("La hora de inicio debe ser anterior a la hora de fin.");
  }

  const normalizedDate = normalizeDateToUTC(fecha);

  try {
    // Perform database operations in an atomic transaction to avoid double bookings
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch overlaps for the selected court
      const overlaps = await tx.courtOverlap.findMany({
        where: { courtId: canchaId },
      });
      const conflictCourtIds = [canchaId, ...overlaps.map((o) => o.overlapsWithId)];

      // 2. Check if there are any conflicting bookings for the same date and overlapping time
      const conflictingBooking = await tx.reservation.findFirst({
        where: {
          fecha: normalizedDate,
          canchaId: { in: conflictCourtIds },
          AND: [
            { horaInicio: { lt: horaFin } },
            { horaFin: { gt: horaInicio } },
          ],
        },
      });

      if (conflictingBooking) {
        throw new Error(
          "Conflicto de disponibilidad: Esta cancha (o una de sus sub-canchas asociadas) ya está reservada en este horario."
        );
      }

      // 3. Create the database record
      return await tx.reservation.create({
        data: {
          clienteNombre,
          clienteTelefono,
          canchaId,
          fecha: normalizedDate,
          horaInicio,
          horaFin,
        },
      });
    });

    // 4. Synchronize with Google Calendar (outside the transaction to avoid holding DB connections open)
    try {
      const googleEventId = await createGoogleCalendarEvent({
        clienteNombre,
        clienteTelefono,
        canchaId,
        fecha: normalizedDate,
        horaInicio,
        horaFin,
      });

      await prisma.reservation.update({
        where: { id: result.id },
        data: { googleEventId },
      });
    } catch (err) {
      console.error("No se pudo sincronizar la reserva con Google Calendar:", err);
      // We don't fail the action if calendar sync fails, but we log it
    }

    revalidatePath("/");
    return { success: true, reservation: result };
  } catch (error: any) {
    console.error("Error creating reservation action:", error);
    throw new Error(error.message || "Error al crear la reserva.");
  }
}

export async function updateReservation(id: string, input: ReservationInput) {
  const { clienteNombre, clienteTelefono, canchaId, fecha, horaInicio, horaFin } = input;

  if (!id || !clienteNombre || !clienteTelefono || !canchaId || !fecha || !horaInicio || !horaFin) {
    throw new Error("Todos los campos son requeridos.");
  }

  if (horaInicio >= horaFin) {
    throw new Error("La hora de inicio debe ser anterior a la hora de fin.");
  }

  const normalizedDate = normalizeDateToUTC(fecha);

  try {
    const existing = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Reserva no encontrada.");
    }

    // Perform database operations in an atomic transaction to avoid double bookings
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch overlaps for the selected court
      const overlaps = await tx.courtOverlap.findMany({
        where: { courtId: canchaId },
      });
      const conflictCourtIds = [canchaId, ...overlaps.map((o) => o.overlapsWithId)];

      // 2. Check for conflicts, ignoring the current reservation itself
      const conflictingBooking = await tx.reservation.findFirst({
        where: {
          id: { not: id },
          fecha: normalizedDate,
          canchaId: { in: conflictCourtIds },
          AND: [
            { horaInicio: { lt: horaFin } },
            { horaFin: { gt: horaInicio } },
          ],
        },
      });

      if (conflictingBooking) {
        throw new Error(
          "Conflicto de disponibilidad: Esta cancha (o una de sus sub-canchas asociadas) ya está reservada en este horario."
        );
      }

      // 3. Update the database record
      return await tx.reservation.update({
        where: { id },
        data: {
          clienteNombre,
          clienteTelefono,
          canchaId,
          fecha: normalizedDate,
          horaInicio,
          horaFin,
        },
      });
    });

    // 4. Update event on Google Calendar
    if (result.googleEventId) {
      try {
        await updateGoogleCalendarEvent(result.googleEventId, {
          clienteNombre,
          clienteTelefono,
          canchaId,
          fecha: normalizedDate,
          horaInicio,
          horaFin,
        });
      } catch (err) {
        console.error("No se pudo actualizar la reserva en Google Calendar:", err);
      }
    } else {
      // If it didn't have a calendar event previously, try to create one now
      try {
        const googleEventId = await createGoogleCalendarEvent({
          clienteNombre,
          clienteTelefono,
          canchaId,
          fecha: normalizedDate,
          horaInicio,
          horaFin,
        });
        await prisma.reservation.update({
          where: { id: result.id },
          data: { googleEventId },
        });
      } catch (err) {
        console.error("No se pudo crear el evento de Google Calendar retrasado:", err);
      }
    }

    revalidatePath("/");
    return { success: true, reservation: result };
  } catch (error: any) {
    console.error("Error updating reservation action:", error);
    throw new Error(error.message || "Error al actualizar la reserva.");
  }
}

export async function deleteReservation(id: string) {
  if (!id) {
    throw new Error("ID de reserva requerido.");
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new Error("Reserva no encontrada.");
    }

    // Delete from DB
    await prisma.reservation.delete({
      where: { id },
    });

    // Delete from Google Calendar
    if (reservation.googleEventId) {
      try {
        await deleteGoogleCalendarEvent(reservation.googleEventId);
      } catch (err) {
        console.error("No se pudo eliminar de Google Calendar:", err);
      }
    }

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting reservation action:", error);
    throw new Error(error.message || "Error al eliminar la reserva.");
  }
}

export async function getDashboardStats() {
  try {
    // Get all reservations to calculate statistics
    const reservations = await prisma.reservation.findMany({
      include: { court: true },
    });

    // Helper to calculate revenue for a reservation
    const calculateEstimatedRevenue = (cId: string, hStart: string, hEnd: string) => {
      let rate = 100; // Fútbol 7 hourly rate
      if (cId.startsWith("F9_")) {
        rate = 140; // Fútbol 9 hourly rate
      } else if (cId.startsWith("F11_")) {
        rate = 180; // Fútbol 11 hourly rate
      }

      const [startH, startM] = hStart.split(":").map(Number);
      const [endH, endM] = hEnd.split(":").map(Number);

      const durationHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
      return durationHours > 0 ? durationHours * rate : 0;
    };

    // Calculate total revenue and category rentability
    let totalRevenue = 0;
    const categoryRevenue: Record<string, number> = {
      "Fútbol 7": 0,
      "Fútbol 9": 0,
      "Fútbol 11": 0,
    };

    reservations.forEach((r) => {
      const rev = calculateEstimatedRevenue(r.canchaId, r.horaInicio, r.horaFin);
      totalRevenue += rev;

      if (r.canchaId.startsWith("F7_")) {
        categoryRevenue["Fútbol 7"] += rev;
      } else if (r.canchaId.startsWith("F9_")) {
        categoryRevenue["Fútbol 9"] += rev;
      } else if (r.canchaId.startsWith("F11_")) {
        categoryRevenue["Fútbol 11"] += rev;
      }
    });

    const categoryRentabilityData = Object.keys(categoryRevenue).map((category) => ({
      categoria: category,
      ingresos: categoryRevenue[category],
    }));

    // 7-day revenue projection starting from today (in local timezone)
    const projectionData: { diaSemana: string; ingresos: number }[] = [];
    const weekdayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);

      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
      const dd = String(targetDate.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const label = i === 0 ? "Hoy" : weekdayNames[targetDate.getDay()];

      let dailyRevenue = 0;
      reservations.forEach((r) => {
        const rDate = new Date(r.fecha);
        const ry = rDate.getUTCFullYear();
        const rm = String(rDate.getUTCMonth() + 1).padStart(2, "0");
        const rd = String(rDate.getUTCDate()).padStart(2, "0");
        const rDateStr = `${ry}-${rm}-${rd}`;

        if (rDateStr === dateStr) {
          dailyRevenue += calculateEstimatedRevenue(r.canchaId, r.horaInicio, r.horaFin);
        }
      });

      projectionData.push({
        diaSemana: label,
        ingresos: dailyRevenue,
      });
    }

    // 1. Calculate occupancy per court type and court ID
    const usageCount: Record<string, number> = {};
    const courtsList = await prisma.court.findMany();
    courtsList.forEach((c) => {
      usageCount[c.id] = 0;
    });

    reservations.forEach((r) => {
      if (usageCount[r.canchaId] !== undefined) {
        usageCount[r.canchaId]++;
      } else {
        usageCount[r.canchaId] = 1;
      }
    });

    const courtUsageData = Object.keys(usageCount).map((canchaId) => {
      const court = courtsList.find((c) => c.id === canchaId);
      return {
        canchaId,
        name: court ? court.name : canchaId,
        reservas: usageCount[canchaId],
      };
    });

    // 2. Hourly peak occupancy (Hour bucket 16:00 to 23:00)
    const hourlyDistribution: Record<string, number> = {};
    for (let h = 16; h <= 23; h++) {
      const hourStr = String(h).padStart(2, "0") + ":00";
      hourlyDistribution[hourStr] = 0;
    }

    reservations.forEach((r) => {
      // Find start hour
      const startHour = parseInt(r.horaInicio.split(":")[0], 10);
      const endHour = parseInt(r.horaFin.split(":")[0], 10);

      // Distribute booking count across the hours it spans
      for (let h = startHour; h < endHour; h++) {
        if (h >= 16 && h <= 23) {
          const hourStr = String(h).padStart(2, "0") + ":00";
          hourlyDistribution[hourStr]++;
        }
      }
    });

    const peakHoursData = Object.keys(hourlyDistribution).map((hora) => ({
      hora,
      reservas: hourlyDistribution[hora],
    }));

    // 3. Weekly occupancy rate (reservations per day of the week for the last 30 days)
    const dailyDistribution: Record<string, number> = {
      Lunes: 0,
      Martes: 0,
      Miércoles: 0,
      Jueves: 0,
      Viernes: 0,
      Sábado: 0,
      Domingo: 0,
    };
    const weekdayMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    reservations.forEach((r) => {
      const date = new Date(r.fecha);
      const dayName = weekdayMap[date.getUTCDay()];
      if (dailyDistribution[dayName] !== undefined) {
        dailyDistribution[dayName]++;
      }
    });

    const weeklyOccupancyData = Object.keys(dailyDistribution).map((dia) => ({
      dia,
      reservas: dailyDistribution[dia],
    }));

    return {
      courtUsageData,
      peakHoursData,
      weeklyOccupancyData,
      totalReservations: reservations.length,
      totalRevenue,
      categoryRentabilityData,
      projectionData,
    };
  } catch (error) {
    console.error("Error calculating dashboard stats:", error);
    return {
      courtUsageData: [],
      peakHoursData: [],
      weeklyOccupancyData: [],
      totalReservations: 0,
      totalRevenue: 0,
      categoryRentabilityData: [],
      projectionData: [],
    };
  }
}
