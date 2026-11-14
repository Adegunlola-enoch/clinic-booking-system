
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Slot = {
  id: string;
  provider: string;
  start: string;
  end: string;
  available: boolean;
};

type Booking = {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
};

type ConfirmedBooking = Booking & {
  appointment: Slot;
};

const doctorDetails: Record<string, { specialty: string; initials: string }> = {
  "Dr. Sarah Adeyemi": {
    specialty: "General Practitioner",
    initials: "SA",
  },
  "Dr. David Okafor": {
    specialty: "Cardiologist",
    initials: "DO",
  },
  "Dr. Miriam Bello": {
    specialty: "Paediatrician",
    initials: "MB",
  },
  "Dr. Daniel Eze": {
    specialty: "Dentist",
    initials: "DE",
  },
  "Dr. Grace Ibrahim": {
    specialty: "Dermatologist",
    initials: "GI",
  },
};

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    setError("");

    try {
      const response = await fetch("/api/slots", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load appointments.");
      }

      setSlots(data.slots || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load appointments."
      );
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const availableSlots = useMemo(
    () => slots.filter((slot) => slot.available),
    [slots]
  );

    const groupedSlots = useMemo(() => {
    const groups = new Map<string, Slot[]>();

    slots.forEach((slot) => {
      const existing = groups.get(slot.provider) || [];
      groups.set(slot.provider, [...existing, slot]);
    });

    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [slots]);

  const selectedSlotDetails = slots.find(
    (slot) => slot.id === selectedSlot
  );

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-NG", {
      timeZone: "Africa/Lagos",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatShortDate(date: string) {
    return new Date(date).toLocaleDateString("en-NG", {
      timeZone: "Africa/Lagos",
      day: "numeric",
      month: "short",
    });
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString("en-NG", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  async function handleBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const appointment = slots.find((slot) => slot.id === selectedSlot);

    if (!appointment) {
      setError("Please select an available appointment.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          slot_id: selectedSlot,
          name: name.trim(),
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Booking could not be completed.");
      }

      setBooking({
        ...data,
        appointment,
      });

      await loadSlots();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      await loadSlots();
    } finally {
      setSubmitting(false);
    }
  }

  function startNewBooking() {
    setBooking(null);
    setSelectedSlot("");
    setName("");
    setEmail("");
    setError("");
    setSuccessMessage("");
    loadSlots();
  }

  function selectAppointment(slotId: string) {
    setSelectedSlot(slotId);
    setError("");
    setSuccessMessage("");

    document.getElementById("booking-form")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <main className="min-h-screen bg-[#f5f9f8] text-[#173b3a]">
      <header className="sticky top-0 z-20 border-b border-[#e3eeeb] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#087f75] text-2xl font-bold text-white">
              +
            </span>
            <span>
              <span className="block text-xl font-extrabold tracking-tight text-[#087f75]">
                CarePoint
              </span>
              <span className="block text-xs text-[#718986]">
                Healthcare made accessible
              </span>
            </span>
          </a>

          <div className="hidden items-center gap-2 rounded-full bg-[#eaf6f3] px-4 py-2 text-sm font-semibold text-[#087f75] sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#16a085]" />
            Patient Portal
          </div>

          <a
            href="#appointments"
            className="rounded-xl bg-[#087f75] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#06665f]"
          >
            Book now
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#eaf6f3]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#cce8e1] bg-white px-4 py-2 text-sm font-semibold text-[#087f75]">
              <span className="h-2 w-2 rounded-full bg-[#16a085]" />
              Your health, our priority
            </span>

            <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-[#173b3a] sm:text-5xl lg:text-6xl">
              Better care starts with the{" "}
              <span className="text-[#087f75]">right appointment.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-[#607875] sm:text-lg">
              Find a healthcare professional, choose a convenient time, and
              book your clinic appointment in just a few simple steps.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#appointments"
                className="rounded-xl bg-[#087f75] px-6 py-3.5 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#06665f]"
              >
                Explore appointments
              </a>
              <a
                href="#how-it-works"
                className="rounded-xl border border-[#c7dfd9] bg-white px-6 py-3.5 font-semibold text-[#285b55] transition hover:bg-[#f7fcfa]"
              >
                How it works
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm text-[#607875]">
              <span className="flex items-center gap-2">
                <span className="font-bold text-[#087f75]">✓</span>
                Simple online booking
              </span>
              <span className="flex items-center gap-2">
                <span className="font-bold text-[#087f75]">✓</span>
                Convenient time selection
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#ccece3]" />
            <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-[#d8eee8]" />

            <div className="relative rounded-[2rem] border border-white bg-white p-7 shadow-xl shadow-[#174d4510] sm:p-9">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#718986]">
                    Appointment availability
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-[#173b3a]">
                    {loadingSlots ? "—" : availableSlots.length}
                  </p>
                  <p className="mt-1 text-sm text-[#718986]">
                    Available time slots
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf6f3] text-3xl text-[#087f75]">
                  +
                </div>
              </div>

              <div className="my-7 h-px bg-[#eaf0ee]" />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf6f3] text-lg text-[#087f75]">
                    ✓
                  </span>
                  <div>
                    <p className="font-semibold text-[#234441]">
                      Choose your doctor
                    </p>
                    <p className="text-sm text-[#718986]">
                      Browse available professionals
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf6f3] text-lg text-[#087f75]">
                    ◷
                  </span>
                  <div>
                    <p className="font-semibold text-[#234441]">
                      Select a convenient time
                    </p>
                    <p className="text-sm text-[#718986]">
                      Pick from available appointments
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf6f3] text-lg text-[#087f75]">
                    ✓
                  </span>
                  <div>
                    <p className="font-semibold text-[#234441]">
                      Confirm your booking
                    </p>
                    <p className="text-sm text-[#718986]">
                      Receive your booking reference
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="appointments"
        className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-20"
      >
        <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#087f75]">
              Our healthcare professionals
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#173b3a] sm:text-4xl">
              Find the right doctor
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-[#718986]">
              Explore our available doctors and select an appointment time
              that works for you.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSlots}
            disabled={loadingSlots}
            className="w-fit rounded-xl border border-[#cfe1dc] bg-white px-4 py-2.5 text-sm font-semibold text-[#087f75] transition hover:bg-[#eaf6f3] disabled:opacity-50"
          >
            {loadingSlots ? "Refreshing..." : "↻ Refresh availability"}
          </button>
        </div>

        {error && !booking && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loadingSlots ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl border border-[#e3eeeb] bg-white"
              />
            ))}
          </div>
        ) : groupedSlots.length === 0 ? (
          <div className="rounded-2xl border border-[#e3eeeb] bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf6f3] text-2xl text-[#087f75]">
              ◷
            </div>
            <h3 className="mt-5 text-xl font-bold text-[#173b3a]">
              No appointments available
            </h3>
            <p className="mt-2 text-sm text-[#718986]">
              Please check again later for available appointment times.
            </p>
            <button
              type="button"
              onClick={loadSlots}
              className="mt-5 rounded-xl bg-[#087f75] px-5 py-3 text-sm font-semibold text-white hover:bg-[#06665f]"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {groupedSlots.map(([provider, doctorSlots]) => {
              const details = doctorDetails[provider] || {
                specialty: "Healthcare Professional",
                initials: provider
                  .replace("Dr. ", "")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2),
              };

              return (
                <article
                  key={provider}
                  className="rounded-2xl border border-[#e0ebe7] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#174d450d]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#eaf6f3] text-lg font-extrabold text-[#087f75]">
                      {details.initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#173b3a]">
                        {provider}
                      </h3>
                      <p className="mt-1 text-sm text-[#718986]">
                        {details.specialty}
                      </p>
                    </div>
                  </div>

                  <div className="my-5 h-px bg-[#edf2f0]" />

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#315550]">
                      Available appointments
                    </p>
                    <span className="rounded-full bg-[#eaf6f3] px-2.5 py-1 text-xs font-bold text-[#087f75]">
                      {doctorSlots.length} available
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {doctorSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.id;
                      const isBooked = !slot.available;

                      return (
                        <button
                key={slot.id}
                type="button"
                onClick={() => selectAppointment(slot.id)}
                disabled={isBooked}
                aria-pressed={isSelected}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  isBooked
                    ? "cursor-not-allowed border-[#eadede] bg-[#faf6f6] opacity-80"
                    : isSelected
                      ? "border-[#087f75] bg-[#eaf6f3] ring-2 ring-[#087f75]/10"
                      : "border-[#e3eeeb] bg-[#fbfdfc] hover:border-[#8fc9bb] hover:bg-[#f3faf7]"
                }`}
              >
                <span>
                  <span className="block text-sm font-bold text-[#234441]">
                    {formatTime(slot.start)}
                  </span>
                  <span className="mt-1 block text-xs text-[#718986]">
                    {formatShortDate(slot.start)} · 30 minutes
                  </span>
                </span>

                <span
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${
                    isBooked
                      ? "bg-red-100 text-red-700"
                      : isSelected
                        ? "bg-[#087f75] text-white"
                        : "bg-[#eaf6f3] text-[#087f75]"
                  }`}
                >
                  {isBooked ? "Booked" : isSelected ? "Selected" : "Select"}
                </span>
              </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section
        id="booking-form"
        className="scroll-mt-24 border-y border-[#e0ebe7] bg-white"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#087f75]">
              Patient booking
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#173b3a] sm:text-4xl">
              {booking ? "You're booked!" : "Complete your appointment"}
            </h2>
            <p className="mt-4 max-w-md leading-7 text-[#718986]">
              {booking
                ? "Your appointment details are shown here. Keep your booking reference for future enquiries."
                : "Select a doctor and appointment time above, then provide your details to complete your booking."}
            </p>

            <div className="mt-8 rounded-2xl bg-[#eaf6f3] p-5">
              <p className="font-bold text-[#24534d]">Need to make a change?</p>
              <p className="mt-2 text-sm leading-6 text-[#607875]">
                Please contact the clinic directly for assistance with an
                existing appointment.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e0ebe7] bg-[#fbfdfc] p-6 shadow-sm sm:p-8">
            {booking ? (
              <div className="space-y-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e0f5eb] text-3xl font-bold text-[#13804e]">
                  ✓
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-[#13804e]">
                    Booking successful
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold text-[#173b3a]">
                    Appointment confirmed
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#718986]">
                    Your appointment has been successfully reserved.
                  </p>
                </div>

                <div className="space-y-4 rounded-xl border border-[#e0ebe7] bg-white p-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#849894]">
                      Booking reference
                    </p>
                    <p className="mt-1 break-all font-bold text-[#087f75]">
                      {booking.id}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#849894]">
                        Patient
                      </p>
                      <p className="mt-1 font-semibold text-[#234441]">
                        {booking.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#849894]">
                        Email
                      </p>
                      <p className="mt-1 break-all font-semibold text-[#234441]">
                        {booking.email}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-[#edf2f0]" />

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#849894]">
                      Doctor
                    </p>
                    <p className="mt-1 font-semibold text-[#234441]">
                      {booking.appointment.provider}
                    </p>
                    <p className="mt-1 text-sm text-[#718986]">
                      {doctorDetails[booking.appointment.provider]?.specialty ||
                        "Healthcare Professional"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#849894]">
                      Appointment date and time
                    </p>
                    <p className="mt-1 font-semibold text-[#234441]">
                      {formatDate(booking.appointment.start)}
                    </p>
                    <p className="mt-1 text-sm text-[#718986]">
                      {formatTime(booking.appointment.start)} –{" "}
                      {formatTime(booking.appointment.end)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#849894]">
                      Status
                    </p>
                    <span className="rounded-full bg-[#e0f5eb] px-3 py-1 text-xs font-bold capitalize text-[#13804e]">
                      {booking.status}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startNewBooking}
                  className="w-full rounded-xl bg-[#087f75] px-5 py-3.5 font-bold text-white transition hover:bg-[#06665f]"
                >
                  Book another appointment
                </button>
              </div>
            ) : (
              <form onSubmit={handleBooking} className="space-y-5">
                <div>
                  <h3 className="text-xl font-extrabold text-[#173b3a]">
                    Your details
                  </h3>
                  <p className="mt-1 text-sm text-[#718986]">
                    Enter your information to reserve your appointment.
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div
                    role="status"
                    className="rounded-xl border border-[#bce8d4] bg-[#eaf8f0] p-4 text-sm text-[#176b45]"
                  >
                    {successMessage}
                  </div>
                )}

                <div className="rounded-xl border border-[#d8ebe5] bg-[#eaf6f3] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#718986]">
                    Selected appointment
                  </p>

                  {selectedSlotDetails ? (
                    <div className="mt-2">
                      <p className="font-bold text-[#087f75]">
                        {selectedSlotDetails.provider}
                      </p>
                      <p className="mt-1 text-sm text-[#315550]">
                        {formatDate(selectedSlotDetails.start)}
                      </p>
                      <p className="mt-1 text-sm text-[#315550]">
                        {formatTime(selectedSlotDetails.start)} –{" "}
                        {formatTime(selectedSlotDetails.end)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#718986]">
                      No appointment selected yet. Choose a time from the
                      doctor cards above.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-bold text-[#315550]"
                  >
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={1}
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-[#d8e4e0] bg-white px-4 py-3.5 text-[#173b3a] outline-none transition placeholder:text-[#a0b1ad] focus:border-[#087f75] focus:ring-4 focus:ring-[#087f75]/10"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-bold text-[#315550]"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#d8e4e0] bg-white px-4 py-3.5 text-[#173b3a] outline-none transition placeholder:text-[#a0b1ad] focus:border-[#087f75] focus:ring-4 focus:ring-[#087f75]/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    loadingSlots ||
                    !selectedSlot ||
                    !selectedSlotDetails?.available
                  }
                  className="w-full rounded-xl bg-[#087f75] px-5 py-4 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#06665f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Confirming your appointment..."
                    : "Confirm appointment"}
                </button>

                <p className="text-center text-xs leading-5 text-[#849894]">
                  Your appointment is reserved only after successful
                  confirmation by CarePoint.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#eaf6f3]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#087f75]">
              Simple and convenient
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-[#173b3a] sm:text-3xl">
              How CarePoint booking works
            </h2>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Choose a doctor",
                description:
                  "Browse the available healthcare professionals and their specialties.",
              },
              {
                number: "02",
                title: "Select a time",
                description:
                  "Choose an appointment time that fits your schedule.",
              },
              {
                number: "03",
                title: "Confirm booking",
                description:
                  "Provide your details and receive your booking reference.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-[#dcece6] bg-white p-6"
              >
                <p className="text-sm font-extrabold tracking-wider text-[#087f75]">
                  {step.number}
                </p>
                <h3 className="mt-3 text-lg font-bold text-[#234441]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#718986]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#173b3a] px-5 py-8 text-center text-sm text-[#c4d8d3]">
        <p className="text-lg font-extrabold text-white">CarePoint</p>
        <p className="mt-2">Clinic Appointment Booking Portal</p>
        <p className="mt-4 text-xs text-[#9db8b1]">
          © {new Date().getFullYear()} CarePoint. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
