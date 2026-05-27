import { addBooking, getBookings, updateBooking } from "../storage/bookings-store.js";
import { recordAuditEvent } from "../storage/audit-store.js";
import { getClientIp, checkRateLimit } from "../security/rate-limit.js";
import { createCompactBookingId } from "../utils/ids.js";
import { validateBookingInput, validateStatusInput } from "../utils/validation.js";
import { sendBookingCreatedEmails, sendBookingStatusEmail } from "./email.js";

async function createUniqueBookingId() {
  const existingIds = new Set((await getBookings()).map((booking) => booking.id));

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const id = createCompactBookingId();
    if (!existingIds.has(id)) return id;
  }

  throw new Error("Unable to generate a unique booking ID.");
}

export async function createBooking(request, input) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`booking:${ip}`, {
    limit: 8,
    windowMs: 1000 * 60 * 60,
  });

  if (!limit.allowed) {
    return {
      status: 429,
      body: {
        success: false,
        error: "Too many booking attempts. Please call dispatch directly.",
      },
    };
  }

  const validation = validateBookingInput(input);
  if (!validation.ok) {
    return {
      status: 422,
      body: {
        success: false,
        errors: validation.errors,
      },
    };
  }

  const now = new Date().toISOString();
  const booking = {
    id: await createUniqueBookingId(),
    status: "pending",
    ...validation.value,
    adminNotes: [],
    source: {
      ip,
      userAgent: request.headers["user-agent"] || "unknown",
    },
    createdAt: now,
    updatedAt: now,
  };

  await addBooking(booking);
  await recordAuditEvent("booking.created", {
    bookingId: booking.id,
    passenger: `${booking.passenger.firstName} ${booking.passenger.lastName}`,
  });
  const queuedEmails = await sendBookingCreatedEmails(booking);

  return {
    status: 201,
    body: {
      success: true,
      bookingId: booking.id,
      status: booking.status,
      queuedEmails: queuedEmails.length,
      message: "Booking request received.",
    },
  };
}

export async function listBookings() {
  return getBookings();
}

export async function updateBookingStatus(id, input, admin) {
  const validation = validateStatusInput(input);
  if (!validation.ok) {
    return {
      status: 422,
      body: {
        success: false,
        error: validation.error,
      },
    };
  }

  const updated = await updateBooking(id, (booking) => {
    const note = validation.value.note
      ? {
          body: validation.value.note,
          author: admin.email,
          createdAt: new Date().toISOString(),
        }
      : null;

    return {
      ...booking,
      status: validation.value.status,
      adminNotes: note ? [note, ...(booking.adminNotes || [])] : booking.adminNotes || [],
      updatedAt: new Date().toISOString(),
    };
  });

  if (!updated) {
    return {
      status: 404,
      body: {
        success: false,
        error: "Booking not found.",
      },
    };
  }

  await recordAuditEvent("booking.status_updated", {
    bookingId: updated.id,
    status: updated.status,
    admin: admin.email,
  });

  const shouldNotifyPassenger = ["confirmed", "needs_information", "cancelled"].includes(
    updated.status
  );
  const queuedEmail = shouldNotifyPassenger ? await sendBookingStatusEmail(updated) : null;

  return {
    status: 200,
    body: {
      success: true,
      booking: updated,
      queuedEmail: Boolean(queuedEmail),
    },
  };
}
