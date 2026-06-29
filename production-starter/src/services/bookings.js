import {
  addBooking,
  getBookingStorageStatus,
  getBookings,
  updateBooking,
} from "../storage/bookings-store.js";
import { recordAuditEvent } from "../storage/audit-store.js";
import { getClientIp, checkRateLimit } from "../security/rate-limit.js";
import { createCompactBookingId } from "../utils/ids.js";
import { validateBookingInput, validateStatusInput } from "../utils/validation.js";
import { linkBookingToCustomer } from "./customers.js";
import { sendBookingCreatedEmails } from "./email.js";
import {
  getCustomerEmailDiagnostics,
  getSmtpNotificationDiagnostics,
  sendCeoRideRequestNotification,
  sendCustomerRideRequestConfirmation,
} from "./smtp-notifications.js";

async function createUniqueBookingId() {
  const existingIds = new Set((await getBookings()).map((booking) => booking.id));

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const id = createCompactBookingId();
    if (!existingIds.has(id)) return id;
  }

  throw new Error("Unable to generate a unique booking ID.");
}

const STATUS_VALUES = new Set([
  "new_request",
  "contacted",
  "scheduled",
  "completed",
  "cancelled",
]);

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase().replaceAll(" ", "_");
  if (status === "pending") return "new_request";
  if (status === "needs_information") return "contacted";
  if (status === "confirmed" || status === "in_progress") return "scheduled";
  return STATUS_VALUES.has(status) ? status : "new_request";
}

function splitName(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function normalizeServiceType(value) {
  const serviceType = String(value || "").trim().toLowerCase();
  if (["ambulatory", "wheelchair", "other"].includes(serviceType)) return serviceType;
  if (serviceType.includes("wheelchair")) return "wheelchair";
  if (serviceType.includes("ambulatory")) return "ambulatory";
  return serviceType || "other";
}

function normalizeBookingRecord(booking) {
  const passenger = booking.passenger || {};
  const trip = booking.trip || {};
  const legacyName = splitName(booking.name);

  return {
    ...booking,
    id: String(booking.id || booking.bookingId || ""),
    customerId: booking.customerId || booking.customer_id || "",
    status: normalizeStatus(booking.status),
    passenger: {
      firstName: passenger.firstName || booking.firstName || legacyName.firstName || "Unknown",
      lastName: passenger.lastName || booking.lastName || legacyName.lastName || "Passenger",
      email: passenger.email || booking.email || "",
      phone: passenger.phone || booking.phone || "",
    },
    trip: {
      pickupDate: trip.pickupDate || booking.pickupDate || booking.date || "",
      pickupTime: trip.pickupTime || booking.pickupTime || booking.time || "",
      pickupAddress: trip.pickupAddress || booking.pickupAddress || booking.pickup || "",
      dropoffAddress:
        trip.dropoffAddress || booking.dropoffAddress || booking.destination || booking.dropoff || "",
      serviceType: normalizeServiceType(trip.serviceType || booking.serviceType || booking.mobility),
      appointmentTime: trip.appointmentTime || booking.appointmentTime || "",
      returnTrip: Boolean(trip.returnTrip ?? booking.returnTrip ?? booking.tripType === "Recurring"),
      notes: trip.notes || booking.notes || "",
    },
    accessibility: {
      wheelchair: Boolean(booking.accessibility?.wheelchair ?? booking.wheelchair),
    },
    consent: booking.consent || {
      contactPermission: true,
      smsUpdatesOptIn: Boolean(booking.smsUpdatesOptIn ?? booking.smsConsent),
      smsUpdates: Boolean(booking.smsUpdatesOptIn ?? booking.smsConsent),
    },
    adminNotes: Array.isArray(booking.adminNotes) ? booking.adminNotes : [],
    source: booking.source || {},
    createdAt: booking.createdAt || "",
    updatedAt: booking.updatedAt || booking.createdAt || "",
  };
}

async function attachCustomerId(booking) {
  try {
    const customer = await linkBookingToCustomer(booking);
    if (!customer?.id) return booking;

    console.info("[booking] Customer linked.", {
      bookingId: booking.id,
      customerId: customer.id,
    });
    return {
      ...booking,
      customerId: customer.id,
    };
  } catch (error) {
    console.error("[booking] Customer linking failed; booking will still be saved.", {
      bookingId: booking.id,
      code: error?.code || null,
      message: error?.message || "Unknown customer linking error",
    });
    return booking;
  }
}

export function bookingStorageUnavailableResponse() {
  const storage = getBookingStorageStatus();
  if (storage.available) return null;

  return {
    status: 503,
    body: {
      success: false,
      error: "Booking storage is not configured. Set DATABASE_URL to a Neon Postgres connection string.",
      storage,
    },
  };
}

export async function createBooking(request, input) {
  const unavailable = bookingStorageUnavailableResponse();
  if (unavailable) return unavailable;

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
        error: "Too many booking attempts. Please call our team directly.",
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
  let booking = {
    id: await createUniqueBookingId(),
    status: "new_request",
    ...validation.value,
    adminNotes: [],
    source: {
      ip,
      userAgent: request.headers["user-agent"] || "unknown",
    },
    createdAt: now,
    updatedAt: now,
  };

  booking = await attachCustomerId(booking);

  await addBooking(booking);
  console.info("[booking] Booking saved.", {
    bookingId: booking.id,
    status: booking.status,
    ...getCustomerEmailDiagnostics(booking),
  });
  await recordAuditEvent("booking.created", {
    bookingId: booking.id,
    passenger: `${booking.passenger.firstName} ${booking.passenger.lastName}`,
  });
  const queuedEmails = await sendBookingCreatedEmails(booking);
  console.info("[booking] SMTP notification config snapshot.", {
    bookingId: booking.id,
    ...getSmtpNotificationDiagnostics(),
  });
  const internalNotification = await sendCeoRideRequestNotification(booking);
  console.info("[booking] Internal notification finished.", {
    bookingId: booking.id,
    sent: internalNotification.sent,
    failed: internalNotification.failed,
    skipped: internalNotification.skipped,
  });
  const customerConfirmation = await sendCustomerRideRequestConfirmation(booking);
  console.info("[booking] Customer confirmation finished.", {
    bookingId: booking.id,
    customerConfirmationAttempted: customerConfirmation.attempted,
    customerConfirmationSent: customerConfirmation.sent,
    customerConfirmationSkipped: customerConfirmation.skipped,
    customerConfirmationSkippedReason: customerConfirmation.skippedReason,
  });

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
  return (await getBookings()).map(normalizeBookingRecord);
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
    const previousStatus = booking.status;
    const note = validation.value.note
      ? {
          body: validation.value.note,
          author: admin.email,
          createdAt: new Date().toISOString(),
        }
      : null;

    const statusAudit =
      previousStatus === validation.value.status
        ? []
        : [
            {
              action: "ride_status_changed",
              oldValue: previousStatus || "",
              newValue: validation.value.status,
              actor: admin.email || "Admin",
              timestamp: new Date().toISOString(),
            },
          ];
    const operations = booking.operations || {};

    return {
      ...booking,
      status: validation.value.status,
      adminNotes: note ? [note, ...(booking.adminNotes || [])] : booking.adminNotes || [],
      operations: {
        ...operations,
        auditTrail: [...statusAudit, ...(Array.isArray(operations.auditTrail) ? operations.auditTrail : [])].slice(0, 100),
      },
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

  return {
    status: 200,
    body: {
      success: true,
      booking: updated,
      queuedEmail: false,
    },
  };
}
