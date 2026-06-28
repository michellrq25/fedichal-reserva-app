import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

let connectionString = process.env.DATABASE_URL;
const isLocal = connectionString ? (connectionString.includes("localhost") || connectionString.includes("127.0.0.1")) : true;

if (!isLocal && connectionString && connectionString.includes("?")) {
  connectionString = connectionString.split("?")[0];
}

const poolConfig: any = { connectionString };
if (!isLocal) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new pg.Pool(poolConfig);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Iniciando sembrado de datos (seed)...");

  // 1. Limpiar base de datos
  await prisma.courtOverlap.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.court.deleteMany({});

  // 2. Crear las Canchas
  const courts = [
    { id: "F7_1", name: "Cancha Fútbol 7 - 1", type: "F7" },
    { id: "F7_2", name: "Cancha Fútbol 7 - 2", type: "F7" },
    { id: "F7_3", name: "Cancha Fútbol 7 - 3", type: "F7" },
    { id: "F7_4", name: "Cancha Fútbol 7 - 4", type: "F7" },
    { id: "F9_A", name: "Cancha Fútbol 9 - A", type: "F9" },
    { id: "F9_B", name: "Cancha Fútbol 9 - B", type: "F9" },
    { id: "F11_Única", name: "Cancha Fútbol 11 - Única", type: "F11" },
  ];

  for (const court of courts) {
    await prisma.court.create({
      data: court,
    });
  }
  console.log("Canchas creadas.");

  // 3. Crear las Relaciones de Solapamiento (Bidireccionales)
  // Definimos las parejas de solape físico.
  const overlapPairs = [
    // F7_1 se solapa con F9_A y F11_Única
    ["F7_1", "F9_A"],
    ["F7_1", "F11_Única"],
    // F7_2 se solapa con F9_A y F11_Única
    ["F7_2", "F9_A"],
    ["F7_2", "F11_Única"],
    // F7_3 se solapa con F9_B y F11_Única
    ["F7_3", "F9_B"],
    ["F7_3", "F11_Única"],
    // F7_4 se solapa con F9_B y F11_Única
    ["F7_4", "F9_B"],
    ["F7_4", "F11_Única"],
    // F9_A se solapa con F11_Única (ya que F9_A contiene F7_1 y F7_2)
    ["F9_A", "F11_Única"],
    // F9_B se solapa con F11_Única (ya que F9_B contiene F7_3 y F7_4)
    ["F9_B", "F11_Única"],
  ];

  for (const [c1, c2] of overlapPairs) {
    // Al ser bidireccional, creamos ambas direcciones
    await prisma.courtOverlap.create({
      data: { courtId: c1, overlapsWithId: c2 },
    });
    await prisma.courtOverlap.create({
      data: { courtId: c2, overlapsWithId: c1 },
    });
  }

  console.log("Relaciones de solapamiento creadas.");
  console.log("Sembrado de datos finalizado correctamente.");
}

main()
  .catch((e) => {
    console.error("Error en el sembrado de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
