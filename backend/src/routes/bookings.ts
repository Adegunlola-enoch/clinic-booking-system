import { createHash } from "node:crypto";
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();


async function checkBookingRateLimit(email: string): Promise<number | null> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60_000);

  return prisma.$transaction(async (tx) => {
    // Lock this email to prevent simultaneous requests
    // from bypassing the attempt limit.
    await tx.$queryRaw`
  SELECT 1 AS locked
  FROM (
    SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))
  ) AS lock_result
`;

    // Record this booking attempt.
    await tx.bookingAttempt.create({
      data: { email },
    });

    // Count attempts within the last 60 seconds.
    const count = await tx.bookingAttempt.count({
      where: {
        email,
        createdAt: { gte: windowStart },
      },
    });

    // Allow the first five attempts.
    if (count <= 5) {
      return null;
    }

    // Find the oldest attempt still inside the window.
    const oldestAttempt = await tx.bookingAttempt.findFirst({
      where: {
        email,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!oldestAttempt) {
      return 1;
    }

    // Calculate the remaining waiting time in seconds.
    return Math.max(
      1,
      Math.ceil(
        (oldestAttempt.createdAt.getTime() + 60_000 - Date.now()) / 1000
      )
    );
    }, {
    maxWait: 10000,
    timeout: 20000,
  });
}


// POST /bookings

router.post("/bookings", async (req: Request, res: Response) => {
  const idempotencyKey = req.header("Idempotency-Key")?.trim();
  const body = req.body ?? {};


// LEVEL 5: RATE LIMITING

const rawEmail = body.email;

if (typeof rawEmail === "string" && rawEmail.trim()) {
  const email = rawEmail.trim().toLowerCase();

  const retryAfter = await checkBookingRateLimit(email);

  if (retryAfter !== null) {
    res.setHeader("Retry-After", String(retryAfter));

    return res.status(429).json({
      error: "too many booking attempts",
    });
  }
}


  // Create a consistent hash of the booking request
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        slot_id: body.slot_id ?? null,
        name: body.name ?? null,
        email: body.email ?? null,
      })
    )
    .digest("hex");

  // Helper to save and return an idempotent response
  const sendAndStore = async (
    statusCode: number,
    responseBody: object
  ) => {
    if (idempotencyKey) {
      await prisma.idempotencyRecord.update({
        where: { key: idempotencyKey },
        data: {
          statusCode,
          response: responseBody as any,
        },
      });
    }

    return res.status(statusCode).json(responseBody);
  };

  try {
    // 1. Check whether this idempotency key already exists
    if (idempotencyKey) {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });

      if (existing) {
        if (existing.requestHash !== requestHash) {
          return res.status(422).json({
            error: "idempotency key reused with different request",
          });
        }

        if (existing.statusCode !== null && existing.response !== null) {
          return res.status(existing.statusCode).json(existing.response);
        }

        return res.status(409).json({
          error: "request is still processing",
        });
      }

      // Reserve this key for the current request
      try {
        await prisma.idempotencyRecord.create({
          data: {
            key: idempotencyKey,
            requestHash,
          },
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          const concurrent = await prisma.idempotencyRecord.findUnique({
            where: { key: idempotencyKey },
          });

          if (!concurrent) throw error;

          if (concurrent.requestHash !== requestHash) {
            return res.status(422).json({
              error: "idempotency key reused with different request",
            });
          }

          if (
            concurrent.statusCode !== null &&
            concurrent.response !== null
          ) {
            return res.status(concurrent.statusCode).json(
              concurrent.response
            );
          }

          return res.status(409).json({
            error: "request is still processing",
          });
        }

        throw error;
      }
    }

    // 2. Validate the booking details
    const { slot_id, name, email } = body;

    if (
      typeof slot_id !== "string" ||
      !slot_id.trim() ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return await sendAndStore(400, {
        error: "missing or invalid booking details",
      });
    }

    const cleanSlotId = slot_id.trim();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return await sendAndStore(400, {
        error: "invalid email address",
      });
    }

    // 3. Check whether the slot exists
    const slot = await prisma.slot.findUnique({
      where: { id: cleanSlotId },
    });

    if (!slot) {
      return await sendAndStore(404, {
        error: "slot not found",
      });
    }

    // 4. Check whether the slot has already started
    if (slot.start.getTime() <= Date.now()) {
      return await sendAndStore(400, {
        error: "slot has already started",
      });
    }

    // 5. Check whether the slot is already booked
    const existingBooking = await prisma.booking.findFirst({
      where: {
        slotId: cleanSlotId,
        status: "confirmed",
      },
    });

    if (existingBooking) {
      return await sendAndStore(409, {
        error: "slot already booked",
      });
    }

    // 6. Create booking and save its idempotency response atomically
    const bookingResponse = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          slotId: cleanSlotId,
          name: cleanName,
          email: cleanEmail,
          status: "confirmed",
        },
      });

      const responseBody = {
        id: booking.id,
        slot_id: booking.slotId,
        name: booking.name,
        email: booking.email,
        status: booking.status,
        created_at: booking.createdAt.toISOString(),
      };

      if (idempotencyKey) {
        await tx.idempotencyRecord.update({
          where: { key: idempotencyKey },
          data: {
            statusCode: 201,
            response: responseBody as any,
          },
        });
      }

      return responseBody;
    });

    return res.status(201).json(bookingResponse);

  } catch (error) {
    // Handle simultaneous attempts to book the same slot
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return await sendAndStore(409, {
        error: "slot already booked",
      });
    }

    console.error("Create booking error:", error);

    try {
      return await sendAndStore(500, {
        error: "internal server error",
      });
    } catch {
      return res.status(500).json({
        error: "internal server error",
      });
    }
  }
});


// GET /bookings/:id

router.get("/bookings/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({
        error: "invalid booking id",
      });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      res.status(404).json({
        error: "booking not found",
      });
      return;
    }

    res.status(200).json({
      id: booking.id,
      slot_id: booking.slotId,
      name: booking.name,
      email: booking.email,
      status: booking.status,
      created_at: booking.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Get booking error:", error);

    res.status(500).json({
      error: "internal server error",
    });
  }
});


// DELETE /bookings/:id
router.delete("/bookings/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({
        error: "invalid booking id",
      });
      return;
    }

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      res.status(404).json({
        error: "booking not found",
      });
      return;
    }

    // Prevent cancelling an already cancelled booking
    if (booking.status === "cancelled") {
      res.status(409).json({
        error: "booking already cancelled",
      });
      return;
    }

    // Update booking status instead of deleting the record
    const cancelledBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: "cancelled",
      },
    });

    res.status(200).json({
      id: cancelledBooking.id,
      slot_id: cancelledBooking.slotId,
      name: cancelledBooking.name,
      email: cancelledBooking.email,
      status: cancelledBooking.status,
      created_at: cancelledBooking.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    res.status(500).json({
      error: "internal server error",
    });
  }
});


 // GET /bookings?email=ada@example.com&limit=10
router.get("/bookings", async (req: Request, res: Response) => {
  try {
    const emailParam = req.query.email;
    const limitParam = req.query.limit;
    const cursorParam = req.query.cursor;

    // Validate email
    if (typeof emailParam !== "string" || !emailParam.trim()) {
      res.status(400).json({
        error: "email is required",
      });
      return;
    }

    const email = emailParam.trim();

    // Validate limit
    let limit = 10;

    if (limitParam !== undefined) {
      if (
        typeof limitParam !== "string" ||
        !/^\d+$/.test(limitParam)
      ) {
        res.status(400).json({
          error: "invalid limit",
        });
        return;
      }

      limit = Number(limitParam);

      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        res.status(400).json({
          error: "invalid limit",
        });
        return;
      }
    }

    // Decode and validate cursor
    let cursorData: { createdAt: string; id: string } | null = null;

    if (cursorParam !== undefined) {
      if (typeof cursorParam !== "string") {
        res.status(400).json({
          error: "invalid cursor",
        });
        return;
      }

      try {
        const decoded = JSON.parse(
          Buffer.from(cursorParam, "base64url").toString("utf8")
        );

        if (
          typeof decoded.createdAt !== "string" ||
          typeof decoded.id !== "string" ||
          !decoded.id ||
          Number.isNaN(Date.parse(decoded.createdAt))
        ) {
          throw new Error("Invalid cursor data");
        }

        cursorData = decoded;
      } catch {
        res.status(400).json({
          error: "invalid cursor",
        });
        return;
      }
    }

    // Build the database query
    const where = {
      email: {
        equals: email,
        mode: "insensitive" as const,
      },
      ...(cursorData
        ? {
            OR: [
              {
                createdAt: {
                  gt: new Date(cursorData.createdAt),
                },
              },
              {
                createdAt: new Date(cursorData.createdAt),
                id: {
                  gt: cursorData.id,
                },
              },
            ],
          }
        : {}),
    };

    // Fetch one extra record to determine whether another page exists
    const results = await prisma.booking.findMany({
      where,
      orderBy: [
        { createdAt: "asc" },
        { id: "asc" },
      ],
      take: limit + 1,
    });

    const hasMore = results.length > limit;
    const bookings = results.slice(0, limit);

    const next_cursor =
      hasMore && bookings.length > 0
        ? Buffer.from(
            JSON.stringify({
              createdAt: bookings[bookings.length - 1].createdAt.toISOString(),
              id: bookings[bookings.length - 1].id,
            })
          ).toString("base64url")
        : null;

    res.status(200).json({
      bookings: bookings.map((booking) => ({
        id: booking.id,
        slot_id: booking.slotId,
        name: booking.name,
        email: booking.email,
        status: booking.status,
        created_at: booking.createdAt.toISOString(),
      })),
      next_cursor,
    });
  } catch (error) {
    console.error("Get bookings error:", error);

    res.status(500).json({
      error: "internal server error",
    });
  }
});


export default router;
