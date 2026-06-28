"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Trash2, Check } from "lucide-react";
import {
  createReservation,
  updateReservation,
  deleteReservation,
} from "@/app/actions/reservations";

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

interface ReservationDialogProps {
  reservation?: Reservation | null; // If provided, we are editing/deleting
  defaultDate?: string; // YYYY-MM-DD
  defaultCanchaId?: string;
  defaultStartHour?: string; // "HH:00"
  onClose: () => void;
  onSuccess: () => void;
}

const COURTS = [
  { id: "F7_1", name: "Fútbol 7 - Cancha 1" },
  { id: "F7_2", name: "Fútbol 7 - Cancha 2" },
  { id: "F7_3", name: "Fútbol 7 - Cancha 3" },
  { id: "F7_4", name: "Fútbol 7 - Cancha 4" },
  { id: "F9_A", name: "Fútbol 9 - Cancha A" },
  { id: "F9_B", name: "Fútbol 9 - Cancha B" },
  { id: "F11_Única", name: "Fútbol 11 - Única" },
];

// Generate 30-min interval times from 16:00 to 23:30
const START_TIMES = Array.from({ length: 16 }, (_, i) => {
  const h = Math.floor(i / 2) + 16;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const END_TIMES = Array.from({ length: 16 }, (_, i) => {
  const h = Math.floor((i + 1) / 2) + 16;
  const m = (i + 1) % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export function ReservationDialog({
  reservation,
  defaultDate,
  defaultCanchaId,
  defaultStartHour,
  onClose,
  onSuccess,
}: ReservationDialogProps) {
  const isEditing = !!reservation;

  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [canchaId, setCanchaId] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize fields on load
  useEffect(() => {
    if (reservation) {
      setClienteNombre(reservation.clienteNombre);
      setClienteTelefono(reservation.clienteTelefono);
      setCanchaId(reservation.canchaId);
      // Format Date object or ISO string to YYYY-MM-DD
      const d = new Date(reservation.fecha);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      setFecha(`${yyyy}-${mm}-${dd}`);
      setHoraInicio(reservation.horaInicio);
      setHoraFin(reservation.horaFin);
    } else {
      setClienteNombre("");
      setClienteTelefono("");
      setCanchaId(defaultCanchaId || "");
      setFecha(defaultDate || new Date().toISOString().split("T")[0]);

      // Prefill start time if provided
      if (defaultStartHour) {
        setHoraInicio(defaultStartHour);
        // Default reservation length is 1 hour
        const [h, m] = defaultStartHour.split(":");
        const endH = parseInt(h, 10) + 1;
        setHoraFin(`${String(endH).padStart(2, "0")}:${m}`);
      } else {
        setHoraInicio("16:00");
        setHoraFin("17:00");
      }
    }
  }, [reservation, defaultDate, defaultCanchaId, defaultStartHour]);

  // Adjust end time if start time is changed to be after end time
  const handleStartChange = (val: string) => {
    setHoraInicio(val);
    if (val >= horaFin) {
      const [h, m] = val.split(":");
      const startH = parseInt(h, 10);
      let endH = startH + 1;
      let endM = m;
      if (endH >= 24) {
        endH = 24;
        endM = "00";
      }
      setHoraFin(`${String(endH).padStart(2, "0")}:${endM}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre.trim() || !clienteTelefono.trim() || !canchaId || !fecha || !horaInicio || !horaFin) {
      toast.error("Por favor completa todos los campos.");
      return;
    }

    if (horaInicio >= horaFin) {
      toast.error("La hora de inicio debe ser anterior a la hora de fin.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(
      isEditing ? "Actualizando reserva..." : "Creando reserva..."
    );

    try {
      const payload = {
        clienteNombre,
        clienteTelefono,
        canchaId,
        fecha,
        horaInicio,
        horaFin,
      };

      if (isEditing && reservation) {
        await updateReservation(reservation.id, payload);
        toast.success("Reserva actualizada con éxito y sincronizada con Google Calendar.", {
          id: toastId,
        });
      } else {
        await createReservation(payload);
        toast.success("Reserva creada con éxito y sincronizada con Google Calendar.", {
          id: toastId,
        });
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Hubo un error al procesar la reserva.", {
        id: toastId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!reservation) return;

    setIsDeleting(true);
    const toastId = toast.loading("Cancelando reserva...");

    try {
      await deleteReservation(reservation.id);
      toast.success("Reserva cancelada con éxito y removida de Google Calendar.", {
        id: toastId,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error al cancelar la reserva.", {
        id: toastId,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto border-border/50 bg-card/95 backdrop-blur-xl text-foreground rounded-2xl shadow-2xl p-6">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-accent" />
      <DialogHeader className="space-y-2">
        <DialogTitle className="text-xl font-black flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          {isEditing ? "Detalles / Editar Reserva" : "Nueva Reserva"}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground/80 leading-relaxed font-medium">
          {isEditing
            ? "Modifica los datos de la reserva o elimínala. Se actualizará en Google Calendar automáticamente."
            : "Completa los datos del cliente para bloquear el horario. Se validarán conflictos de solapamiento."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <div className="space-y-1.5">
          <label htmlFor="nombre" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Nombre del Cliente
          </label>
          <Input
            id="nombre"
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            placeholder="Ej: Marcelo Gómez"
            required
            disabled={isSubmitting || isDeleting}
            className="bg-secondary/20 border-border/30 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/10 rounded-xl px-4 py-2.5 text-sm font-semibold h-11"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="telefono" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Teléfono de Contacto
          </label>
          <Input
            id="telefono"
            type="tel"
            value={clienteTelefono}
            onChange={(e) => setClienteTelefono(e.target.value)}
            placeholder="Ej: +51 987654321"
            required
            disabled={isSubmitting || isDeleting}
            className="bg-secondary/20 border-border/30 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/10 rounded-xl px-4 py-2.5 text-sm font-semibold h-11"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cancha" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Seleccionar Cancha
          </label>
          <Select
            value={canchaId}
            onValueChange={(val) => setCanchaId(val || "")}
            disabled={isSubmitting || isDeleting}
          >
            <SelectTrigger id="cancha" className="w-full bg-secondary/20 border-border/30 focus-visible:border-primary/60 rounded-xl px-4 py-2.5 text-sm font-semibold h-11">
              <SelectValue placeholder="Selecciona una cancha">
                {canchaId ? COURTS.find((c) => c.id === canchaId)?.name : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border/60 text-popover-foreground rounded-xl">
              {COURTS.map((court) => (
                <SelectItem key={court.id} value={court.id} className="cursor-pointer text-xs font-semibold focus:bg-primary focus:text-primary-foreground rounded-lg py-2">
                  {court.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="fecha" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Fecha de Reserva
          </label>
          <Input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            disabled={isSubmitting || isDeleting}
            className="bg-secondary/20 border-border/30 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/10 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer h-11"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="horaInicio" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Hora Inicio
            </label>
            <Select
              value={horaInicio}
              onValueChange={(val) => handleStartChange(val || "")}
              disabled={isSubmitting || isDeleting}
            >
              <SelectTrigger id="horaInicio" className="w-full bg-secondary/20 border-border/30 focus-visible:border-primary/60 rounded-xl px-4 py-2.5 text-sm font-semibold h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border/60 text-popover-foreground rounded-xl max-h-[220px]">
                {START_TIMES.map((time) => (
                  <SelectItem key={time} value={time} className="cursor-pointer text-xs font-semibold focus:bg-primary focus:text-primary-foreground rounded-lg py-2">
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="horaFin" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Hora Fin
            </label>
            <Select
              value={horaFin}
              onValueChange={(val) => setHoraFin(val || "")}
              disabled={isSubmitting || isDeleting}
            >
              <SelectTrigger id="horaFin" className="w-full bg-secondary/20 border-border/30 focus-visible:border-primary/60 rounded-xl px-4 py-2.5 text-sm font-semibold h-11">
                <SelectValue>
                  {horaFin === "24:00" ? "00:00" : horaFin}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border/60 text-popover-foreground rounded-xl max-h-[220px]">
                {END_TIMES.map((time) => (
                  <SelectItem key={time} value={time} className="cursor-pointer text-xs font-semibold focus:bg-primary focus:text-primary-foreground rounded-lg py-2">
                    {time === "24:00" ? "00:00" : time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 pt-4 border-t border-border/30 mt-6">
          {showDeleteConfirm ? (
            <div className="w-full flex flex-col gap-3 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
              <p className="text-xs text-destructive font-bold text-center flex items-center gap-1.5 justify-center">
                ⚠️ ¿Estás seguro de cancelar esta reserva? Se eliminará de Google Calendar.
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="rounded-xl font-bold text-xs h-9 px-4 cursor-pointer"
                >
                  No, mantener
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={executeDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold text-xs h-9 px-4 cursor-pointer flex items-center gap-1.5 justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 w-full justify-between items-center">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto mr-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold cursor-pointer transition-all active:scale-95 text-xs px-4 flex items-center gap-1.5 justify-center h-10"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Eliminar Reserva
                </Button>
              )}
              <div className="flex gap-2 w-full sm:w-auto justify-end ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl border-border/80 hover:bg-secondary/50 font-bold text-xs cursor-pointer px-4 h-10"
                >
                  Cerrar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground font-bold hover:brightness-110 active:scale-[0.98] transition-all rounded-xl text-xs px-4 h-10 cursor-pointer shadow-md shadow-primary/10 flex items-center gap-1.5 justify-center"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  {isSubmitting ? "Procesando..." : isEditing ? "Guardar" : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
