import "dotenv/config";
import express from "express";
import cors from "cors";
import { apiKeyMiddleware } from "./middleware/apiKey";
import slotRoutes from "./routes/slots";
import bookingRoutes from "./routes/bookings";

const app = express();

app.use(cors());
app.use(express.json());

app.use(apiKeyMiddleware);

app.use("/", slotRoutes);
app.use("/", bookingRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Clinic Booking API running on port ${PORT}`);
});