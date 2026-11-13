
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// POST /reset
router.post("/reset", async (req: Request, res: Response) => {
  try {
    const slots = req.body?.slots;

    // Validate that slots is an array
    if (!Array.isArray(slots)) {
      res.status(400).json({
        error: "invalid slots",
      });
      return;
    }

    // Validate the required fields for each slot
    for (const slot of slots) {
      if (
        !slot.id ||
        !slot.provider ||
        !slot.start ||
        !slot.end ||
        Number.isNaN(Date.parse(slot.start)) ||
        Number.isNaN(Date.parse(slot.end))
      ) {
        res.status(400).json({
          error: "invalid slot data",
        });
        return;
      }
    }

    // Replace all existing slots in one transaction
    await prisma.$transaction(
  async (tx) => {
    // Delete bookings first
    await tx.booking.deleteMany();

    // Delete existing slots
    await tx.slot.deleteMany();

    // Insert new slots
    if (slots.length > 0) {
      await tx.slot.createMany({
        data: slots.map((slot: any) => ({
          id: slot.id,
          provider: slot.provider,
          start: new Date(slot.start),
          end: new Date(slot.end),
        })),
      });
    }
  },
  {
    maxWait: 10000,
    timeout: 20000,
  }
);

    res.status(200).json({});
  } catch (error) {
    console.error("Reset error:", error);

    res.status(500).json({
      error: "internal server error",
    });
  }
});


// GET /slots
router.get("/slots", async (req: Request, res: Response) => {
  try {
    const provider = req.query.provider;

    const slots = await prisma.slot.findMany({
      where:
        typeof provider === "string"
          ? { provider }
          : undefined,

      orderBy: {
        start: "asc",
      },

      include: {
        bookings: {
          where: {
            status: "confirmed",
          },
          select: {
            id: true,
          },
        },
      },
    });

    const formattedSlots = slots.map((slot) => ({
      id: slot.id,
      provider: slot.provider,
      start: slot.start,
      end: slot.end,
      available: slot.bookings.length === 0,
    }));

    res.status(200).json({
      slots: formattedSlots,
    });
  } catch (error) {
    console.error("Fetch slots error:", error);

    res.status(500).json({
      error: "internal server error",
    });
  }
});


export default router;
