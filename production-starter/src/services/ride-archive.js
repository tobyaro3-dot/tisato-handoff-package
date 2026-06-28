import { addBooking, getBookings, updateBooking } from "../storage/bookings-store.js";
import { recordAuditEvent } from "../storage/audit-store.js";
import { createCompactBookingId } from "../utils/ids.js";
import { validateManualRideArchiveInput, validateRideArchiveInput } from "../utils/validation.js";
import { linkBookingToCustomer } from "./customers.js";
import { listBookings } from "./bookings.js";

function text(value) {
  return String(value ?? "").trim();
}

function passengerName(passenger = {}) {
  return `${text(passenger.firstName)} ${text(passenger.lastName)}`.trim() || "Unknown Passenger";
}

function tripType(booking = {}) {
  if (booking.trip?.returnTrip) return "Round trip";
  return "One-way";
}

function mobilityType(booking = {}) {
  const serviceType = text(booking.trip?.serviceType);
  const wheelchair = Boolean(booking.accessibility?.wheelchair);
  if (serviceType && wheelchair && !serviceType.toLowerCase().includes("wheelchair")) {
    return `${serviceType} / Wheelchair`;
  }
  return serviceType || (wheelchair ? "Wheelchair" : "");
}

function cityFromAddress(address = "") {
  const parts = text(address)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 3) return parts[parts.length - 2].replace(/\s+[A-Z]{2}\s*\d{0,5}$/i, "").trim();
  if (parts.length === 2) return parts[1].replace(/\s+[A-Z]{2}\s*\d{0,5}$/i, "").trim();
  return "";
}

function statusLabel(value) {
  const labels = {
    new_request: "New Request",
    contacted: "Contacted",
    scheduled: "Scheduled",
    completed: "Completed",
    cancelled: "Cancelled",
    canceled: "Canceled",
    no_show: "No-show",
    requested: "Requested",
    confirmed: "Confirmed",
  };
  return labels[text(value)] || text(value).replaceAll("_", " ") || "Not provided";
}

function rideStatusValue(booking = {}) {
  return text(booking.rideDetails?.rideStatus || booking.ride_details?.rideStatus || booking.status);
}

function facilityValue(facility = {}, key, legacyKey) {
  return text(facility[key] || facility[legacyKey] || "");
}

function auditItem(action, { oldValue = "", newValue = "", actor = "Admin", timestamp = new Date().toISOString() } = {}) {
  return {
    action,
    oldValue: text(oldValue),
    newValue: text(newValue),
    actor: text(actor) || "Admin",
    timestamp,
  };
}

function auditTrail(booking = {}) {
  const operations = booking.operations || {};
  return Array.isArray(operations.auditTrail) ? operations.auditTrail : [];
}

function appendAuditTrail(booking, items) {
  const additions = items.filter(Boolean);
  if (!additions.length) return booking.operations || {};

  return {
    ...(booking.operations || {}),
    auditTrail: [...additions, ...auditTrail(booking)].slice(0, 100),
  };
}

function changedAudit(action, oldValue, newValue, actor) {
  if (text(oldValue) === text(newValue)) return null;
  return auditItem(action, { oldValue, newValue, actor });
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function fieldWasSubmitted(input, group, key) {
  return hasOwn(input[group], key) || hasOwn(input, key);
}

function submittedPatch(input, group, values) {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => fieldWasSubmitted(input, group, key))
  );
}

async function createUniqueManualRideId() {
  const existingIds = new Set((await getBookings()).map((booking) => booking.id));

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const id = createCompactBookingId();
    if (!existingIds.has(id)) return id;
  }

  throw new Error("Unable to generate a unique manual ride ID.");
}

async function attachCustomerId(booking) {
  try {
    const customer = await linkBookingToCustomer(booking);
    if (!customer?.id) return booking;
    return {
      ...booking,
      customerId: customer.id,
    };
  } catch (error) {
    console.error("[ride-archive] Customer linking failed for manual ride.", {
      bookingId: booking.id,
      code: error?.code || null,
      message: error?.message || "Unknown customer linking error",
    });
    return booking;
  }
}

export function normalizeRideArchiveRecord(booking = {}) {
  const passenger = booking.passenger || {};
  const trip = booking.trip || {};
  const rideDetails = booking.rideDetails || booking.ride_details || {};
  const payment = booking.payment || {};
  const facility = booking.facility || {};
  const operations = booking.operations || {};
  const pickupAddress = text(trip.pickupAddress);
  const dropoffAddress = text(trip.dropoffAddress);
  const appointmentDate = text(trip.pickupDate);
  const appointmentTime = text(trip.appointmentTime || trip.pickupTime);
  const serviceType = text(trip.serviceType);
  const city = text(rideDetails.city || rideDetails.serviceCity || booking.city) || cityFromAddress(pickupAddress);

  return {
    id: text(booking.id),
    customerId: text(booking.customerId),
    passengerName: passengerName(passenger),
    passengerPhone: text(passenger.phone),
    passengerEmail: text(passenger.email),
    pickupAddress,
    dropoffAddress,
    appointmentDate,
    appointmentTime,
    rideType: text(rideDetails.rideType) || tripType(booking),
    recordState: text(rideDetails.recordState) || "active",
    serviceType,
    mobilityType: text(rideDetails.mobilityType) || mobilityType(booking),
    tripType: tripType(booking),
    rideStatus: text(rideDetails.rideStatus),
    status: rideStatusValue(booking),
    statusLabel: statusLabel(rideStatusValue(booking)),
    quotedPrice: text(payment.quotedPrice || booking.quotedPrice),
    finalPrice: text(payment.finalPrice || booking.finalPrice),
    paymentStatus: text(payment.paymentStatus || payment.status || booking.paymentStatus),
    paymentMethod: text(payment.paymentMethod || payment.method || booking.paymentMethod),
    facilityName: facilityValue(facility, "facilityName", "name") || text(booking.facilityName),
    facilityContactPerson:
      facilityValue(facility, "facilityContactPerson", "contactPerson") ||
      text(booking.facilityContactPerson),
    facilityPhone: facilityValue(facility, "facilityPhone", "phone") || text(booking.facilityPhone),
    facilityEmail: facilityValue(facility, "facilityEmail", "email") || text(booking.facilityEmail),
    referralSource: text(facility.referralSource || operations.referralSource || booking.referralSource),
    assignedDriver: text(operations.assignedDriver || booking.assignedDriver),
    waitTime: text(operations.waitTime || booking.waitTime),
    city,
    notes: text(trip.notes || booking.notes),
    internalNotes: text(operations.internalNotes || booking.internalNotes),
    internalAdminNotes:
      text(operations.internalNotes || booking.internalNotes) ||
      (Array.isArray(booking.adminNotes)
        ? booking.adminNotes.map((note) => text(note.body || note)).filter(Boolean).join(" | ")
        : text(booking.adminNotes)),
    auditTrail: auditTrail(booking),
    createdAt: text(booking.createdAt),
    updatedAt: text(booking.updatedAt),
  };
}

export async function listRideArchive(options = {}) {
  const includeDeleted = Boolean(options.includeDeleted);
  return (await listBookings())
    .map(normalizeRideArchiveRecord)
    .filter((ride) => {
      if (includeDeleted) return true;
      return ride.recordState === "archived";
    });
}

export async function updateRideArchiveMetadata(id, input, admin) {
  const validation = validateRideArchiveInput(input);
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
    const rideDetailsPatch = submittedPatch(input, "rideDetails", validation.value.rideDetails);
    const paymentPatch = submittedPatch(input, "payment", validation.value.payment);
    const facilityPatch = submittedPatch(input, "facility", validation.value.facility);
    const operationsPatch = submittedPatch(input, "operations", validation.value.operations);
    const nextRideDetails = {
      ...(booking.rideDetails || {}),
      ...rideDetailsPatch,
    };
    const nextPayment = {
      ...(booking.payment || {}),
      ...paymentPatch,
    };
    const nextFacility = {
      ...(booking.facility || {}),
      ...facilityPatch,
    };
    const nextOperations = {
      ...(booking.operations || {}),
      ...operationsPatch,
    };
    const actor = admin?.email || "Admin";
    const auditItems = [
      changedAudit("ride_status_changed", booking.rideDetails?.rideStatus, nextRideDetails.rideStatus, actor),
      changedAudit("payment_status_changed", booking.payment?.paymentStatus, nextPayment.paymentStatus, actor),
      changedAudit("assigned_driver_changed", booking.operations?.assignedDriver, nextOperations.assignedDriver, actor),
      changedAudit("record_state_changed", booking.rideDetails?.recordState || "active", nextRideDetails.recordState || "active", actor),
      auditItem("archive_metadata_edited", { actor }),
    ];

    return {
      ...booking,
      rideDetails: nextRideDetails,
      payment: nextPayment,
      facility: nextFacility,
      operations: {
        ...nextOperations,
        auditTrail: appendAuditTrail({ ...booking, operations: nextOperations }, auditItems).auditTrail,
      },
      updatedAt: new Date().toISOString(),
    };
  });

  if (!updated) {
    return {
      status: 404,
      body: {
        success: false,
        error: "Ride archive record not found.",
      },
    };
  }

  await recordAuditEvent("ride_archive.updated", {
    bookingId: updated.id,
    admin: admin.email,
  });

  return {
    status: 200,
    body: {
      success: true,
      ride: normalizeRideArchiveRecord(updated),
    },
  };
}

export async function createManualRideArchiveRecord(input, admin) {
  const validation = validateManualRideArchiveInput(input);
  if (!validation.ok) {
    return {
      status: 422,
      body: {
        success: false,
        error: validation.error,
        errors: validation.errors,
      },
    };
  }

  const now = new Date().toISOString();
  let booking = {
    id: await createUniqueManualRideId(),
    status: "new_request",
    passenger: validation.value.passenger,
    trip: validation.value.trip,
    accessibility: validation.value.accessibility,
    consent: {
      contactPermission: true,
      smsUpdatesOptIn: false,
      smsUpdates: false,
    },
    rideDetails: validation.value.archive.rideDetails,
    payment: validation.value.archive.payment,
    facility: validation.value.archive.facility,
    operations: validation.value.archive.operations,
    adminNotes: [],
    source: {
      type: "admin_manual",
      admin: admin.email,
    },
    createdAt: now,
    updatedAt: now,
  };

  booking.rideDetails = {
    ...booking.rideDetails,
    recordState: booking.rideDetails.recordState || "archived",
  };
  booking.operations = {
    ...booking.operations,
    auditTrail: [
      auditItem("manual_ride_created", {
        newValue: booking.id,
        actor: admin?.email || "Admin",
        timestamp: now,
      }),
    ],
  };

  booking = await attachCustomerId(booking);
  await addBooking(booking);
  await recordAuditEvent("ride_archive.manual_created", {
    bookingId: booking.id,
    admin: admin.email,
  });

  return {
    status: 201,
    body: {
      success: true,
      ride: normalizeRideArchiveRecord(booking),
    },
  };
}
