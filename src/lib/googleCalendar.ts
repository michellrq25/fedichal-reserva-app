import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

// Helper to format the Date object into 'YYYY-MM-DD' using UTC getters to prevent timezone shifts.
function formatLocalDateString(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getGoogleCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!email || !privateKey || !calendarId) {
    console.warn(
      "⚠️ Google Calendar credentials missing. Using mock calendar service."
    );
    return null;
  }

  // Handle newlines in private key if it comes from environment variables
  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });

  return google.calendar({ version: "v3", auth });
}

export async function createGoogleCalendarEvent(reservation: {
  clienteNombre: string;
  clienteTelefono: string;
  canchaId: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
}): Promise<string> {
  const calendar = getGoogleCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const timezone = process.env.TIMEZONE || "America/Bogota";

  const dateStr = formatLocalDateString(reservation.fecha);
  const startDateTime = `${dateStr}T${reservation.horaInicio}:00`;
  const endDateTime = `${dateStr}T${reservation.horaFin}:00`;

  const eventPayload = {
    summary: `Reserva: ${reservation.canchaId} - ${reservation.clienteNombre}`,
    description: `Cliente: ${reservation.clienteNombre}\nTeléfono: ${reservation.clienteTelefono}\nCancha: ${reservation.canchaId}`,
    start: {
      dateTime: startDateTime,
      timeZone: timezone,
    },
    end: {
      dateTime: endDateTime,
      timeZone: timezone,
    },
  };

  if (!calendar) {
    // Mock Mode
    const mockId = `mock-event-${Date.now()}`;
    console.log(`[Google Calendar MOCK] Created event ${mockId}`, eventPayload);
    return mockId;
  }

  try {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventPayload,
    });
    return response.data.id || `fallback-id-${Date.now()}`;
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    throw error;
  }
}

export async function updateGoogleCalendarEvent(
  googleEventId: string,
  reservation: {
    clienteNombre: string;
    clienteTelefono: string;
    canchaId: string;
    fecha: Date;
    horaInicio: string;
    horaFin: string;
  }
): Promise<void> {
  const calendar = getGoogleCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const timezone = process.env.TIMEZONE || "America/Bogota";

  const dateStr = formatLocalDateString(reservation.fecha);
  const startDateTime = `${dateStr}T${reservation.horaInicio}:00`;
  const endDateTime = `${dateStr}T${reservation.horaFin}:00`;

  const eventPayload = {
    summary: `Reserva: ${reservation.canchaId} - ${reservation.clienteNombre}`,
    description: `Cliente: ${reservation.clienteNombre}\nTeléfono: ${reservation.clienteTelefono}\nCancha: ${reservation.canchaId}`,
    start: {
      dateTime: startDateTime,
      timeZone: timezone,
    },
    end: {
      dateTime: endDateTime,
      timeZone: timezone,
    },
  };

  if (!calendar) {
    // Mock Mode
    console.log(
      `[Google Calendar MOCK] Updated event ${googleEventId}`,
      eventPayload
    );
    return;
  }

  try {
    await calendar.events.update({
      calendarId,
      eventId: googleEventId,
      requestBody: eventPayload,
    });
  } catch (error) {
    console.error(`Error updating Google Calendar event ${googleEventId}:`, error);
    throw error;
  }
}

export async function deleteGoogleCalendarEvent(googleEventId: string): Promise<void> {
  const calendar = getGoogleCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  if (!calendar) {
    // Mock Mode
    console.log(`[Google Calendar MOCK] Deleted event ${googleEventId}`);
    return;
  }

  try {
    await calendar.events.delete({
      calendarId,
      eventId: googleEventId,
    });
  } catch (error) {
    console.error(`Error deleting Google Calendar event ${googleEventId}:`, error);
    // Note: Do not throw if event is already deleted on calendar to prevent lockups
    if ((error as any).code !== 410 && (error as any).code !== 404) {
      throw error;
    }
  }
}
