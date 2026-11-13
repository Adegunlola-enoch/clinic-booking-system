
"use client";

import { useCallback, useEffect, useState } from "react";

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

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const availableSlots = slots.filter((slot) => slot.available);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-NG", {
      timeZone: "Africa/Lagos",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
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

  async function handleBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedSlot) {
      setError("Please select an appointment.");
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
          name,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Booking could not be completed.");
      }

      setBooking(data);
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
    loadSlots();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-indigo-700">
              TheCarePoint
            </h1>
            <p className="text-xs text-slate-500">
              Clinic Appointment Booking
            </p>
          </div>

          <span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
            Patient Portal
          </span>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-2 lg:py-20">
        <div className="space-y-6">
          <span className="inline-block rounded-full bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-700">
            Your health matters
          </span>

          <h2 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Book your next appointment with ease.
          </h2>

          <p className="max-w-lg text-lg leading-8 text-slate-600">
            Choose an available doctor, select a convenient appointment
            time, and confirm your booking in a few simple steps.
          </p>

          <div className="grid max-w-md grid-cols-2 gap-4 pt-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-2xl font-bold text-indigo-700">
                {availableSlots.length}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Available appointments
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-2xl font-bold text-indigo-700">24/7</p>
              <p className="mt-1 text-sm text-slate-500">
                Online booking access
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {booking ? (
            <div className="space-y-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
                ✓
              </div>

              <div>
                <h3 className="text-2xl font-bold">
                  Appointment confirmed!
                </h3>
                <p className="mt-2 text-slate-600">
                  Your appointment has been successfully booked.
                </p>
              </div>

              <div className="space-y-4 rounded-xl bg-slate-50 p-5">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Booking reference
                  </p>
                  <p className="mt-1 break-all font-semibold">
                    {booking.id}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Patient
                  </p>
                  <p className="mt-1 font-semibold">{booking.name}</p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Email
                  </p>
                  <p className="mt-1 font-semibold">{booking.email}</p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Doctor
                  </p>
                  <p className="mt-1 font-semibold">
                    {slots.find((slot) => slot.id === booking.slot_id)
                      ?.provider || "Assigned doctor"}
                  </p>
                </div>

                <div>
                <p className="text-xs font-medium uppercase text-slate-500">
                  Appointment date and time
                </p>
                <p className="mt-1 font-semibold">
                  {(() => {
                    const slot = slots.find(
                      (item) => item.id === booking.slot_id
                    );

                    return slot
                      ? `${formatDate(slot.start)} · ${formatTime(slot.start)} - ${formatTime(slot.end)}`
                      : "Confirmed";
                  })()}
                </p>
              </div>

                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Status
                  </p>
                  <p className="mt-1 font-semibold capitalize text-green-700">
                    {booking.status}
                  </p>
                </div>
              </div>

              <button
                onClick={startNewBooking}
                className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
              >
                Book another appointment
              </button>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold">
                  Book an appointment
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Complete your details to reserve an available time.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="slot"
                  className="block text-sm font-semibold"
                >
                  Select an appointment
                </label>

                {loadingSlots ? (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    Loading available appointments...
                  </p>
                ) : availableSlots.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    No appointments are currently available.
                  </div>
                ) : (
                  <select
                    id="slot"
                    required
                    value={selectedSlot}
                    onChange={(event) =>
                      setSelectedSlot(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Choose a doctor and time</option>

                    {availableSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.provider} — {formatDate(slot.start)} —{" "}
                        {formatTime(slot.start)} to {formatTime(slot.end)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold"
                >
                  Full name
                </label>

                <input
                  id="name"
                  type="text"
                  required
                  minLength={1}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <button
                type="submit"
                disabled={
                  submitting || loadingSlots || availableSlots.length === 0
                }
                className="w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Booking appointment..." : "Confirm appointment"}
              </button>

              <p className="text-center text-xs text-slate-500">
                Your appointment is subject to successful confirmation.
              </p>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        CarePoint Clinic Booking Portal
      </footer>
    </main>
  );
}
