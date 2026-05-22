import { ensureBookingsSchema } from "../src/storage/postgres-bookings-store.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to initialize the Neon database schema.");
  process.exit(1);
}

await ensureBookingsSchema();
console.log("Bookings database schema is ready.");
