CREATE UNIQUE INDEX "one_confirmed_booking_per_slot"
ON "bookings" ("slot_id")
WHERE "status" = 'confirmed';