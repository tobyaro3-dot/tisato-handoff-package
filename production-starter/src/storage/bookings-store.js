import { join } from "node:path";
import { config } from "../config.js";
import { mutateJsonFile, readJsonFile } from "./json-store.js";
import {
  addPostgresBooking,
  getPostgresBookings,
  updatePostgresBooking,
} from "./postgres-bookings-store.js";

const bookingsPath = join(config.dataDir, "bookings.json");

export function getBookingStorageStatus() {
  if (config.databaseUrl) {
    return {
      available: true,
      mode: "postgres",
      persistent: true,
    };
  }

  const productionRequiresDatabase = config.isVercel;
  return {
    available: !productionRequiresDatabase,
    mode: productionRequiresDatabase ? "unconfigured" : "json",
    persistent: false,
  };
}

export async function getBookings() {
  if (config.databaseUrl) return getPostgresBookings();

  const bookings = await readJsonFile(bookingsPath, []);
  return bookings.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function addBooking(booking) {
  if (config.databaseUrl) return addPostgresBooking(booking);

  return mutateJsonFile(bookingsPath, [], async (bookings) => {
    const nextValue = [booking, ...bookings];
    return {
      nextValue,
      result: booking,
    };
  });
}

export async function updateBooking(id, updater) {
  if (config.databaseUrl) return updatePostgresBooking(id, updater);

  return mutateJsonFile(bookingsPath, [], async (bookings) => {
    const index = bookings.findIndex((booking) => booking.id === id);
    if (index === -1) {
      return {
        nextValue: bookings,
        result: null,
      };
    }

    const updated = await updater(bookings[index]);
    const nextValue = bookings.slice();
    nextValue[index] = updated;

    return {
      nextValue,
      result: updated,
    };
  });
}
