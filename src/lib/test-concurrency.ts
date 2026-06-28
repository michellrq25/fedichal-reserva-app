import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

// Setup database client
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Normalization function (same as in Server Action)
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

async function createReservationAtomic(data: {
  clienteNombre: string;
  clienteTelefono: string;
  canchaId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}) {
  const normalizedDate = normalizeDateToUTC(data.fecha);

  return await prisma.$transaction(async (tx) => {
    // 1. Get overlapping courts
    const overlaps = await tx.courtOverlap.findMany({
      where: { courtId: data.canchaId },
    });
    const conflictCourtIds = [data.canchaId, ...overlaps.map((o) => o.overlapsWithId)];

    // 2. Check conflicts
    const conflictingBooking = await tx.reservation.findFirst({
      where: {
        fecha: normalizedDate,
        canchaId: { in: conflictCourtIds },
        AND: [
          { horaInicio: { lt: data.horaFin } },
          { horaFin: { gt: data.horaInicio } },
        ],
      },
    });

    if (conflictingBooking) {
      throw new Error(
        `Conflicto en ${data.clienteNombre}: La cancha (o sus sub-canchas) ya está ocupada en este horario por la reserva de ${conflictingBooking.clienteNombre}.`
      );
    }

    // 3. Create reservation
    return await tx.reservation.create({
      data: {
        clienteNombre: data.clienteNombre,
        clienteTelefono: data.clienteTelefono,
        canchaId: data.canchaId,
        fecha: normalizedDate,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
      },
    });
  });
}

async function runTest() {
  console.log("=== INICIANDO PRUEBA DE CONCURRENCIA ===");
  const targetDate = "2026-07-01";

  // Clean existing bookings for test date
  const normalizedTestDate = normalizeDateToUTC(targetDate);
  await prisma.reservation.deleteMany({
    where: { fecha: normalizedTestDate },
  });
  console.log(`Reservas previas para ${targetDate} eliminadas.`);

  // Define two overlapping bookings
  // Booking 1: F11_Única (takes all courts), 18:00 - 19:30
  const booking1 = {
    clienteNombre: "Cliente A (F11)",
    clienteTelefono: "999888777",
    canchaId: "F11_Única",
    fecha: targetDate,
    horaInicio: "18:00",
    horaFin: "19:30",
  };

  // Booking 2: F7_1 (overlaps with F11), 19:00 - 20:30
  const booking2 = {
    clienteNombre: "Cliente B (F7_1)",
    clienteTelefono: "666555444",
    canchaId: "F7_1",
    fecha: targetDate,
    horaInicio: "19:00",
    horaFin: "20:30",
  };

  console.log("Enviando ambas reservas de forma simultánea (concurrentemente)...");

  const results = await Promise.allSettled([
    createReservationAtomic(booking1),
    createReservationAtomic(booking2),
  ]);

  results.forEach((res, index) => {
    const client = index === 0 ? "Cliente A" : "Cliente B";
    if (res.status === "fulfilled") {
      console.log(`✅ ${client}: Reserva aprobada y creada con éxito (ID: ${res.value.id})`);
    } else {
      console.log(`❌ ${client}: Rechazada correctamente - Motivo: ${res.reason.message}`);
    }
  });

  console.log("=== PRUEBA DE CONCURRENCIA FINALIZADA ===");
}

runTest()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
