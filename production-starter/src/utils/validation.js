import { cleanText, normalizeEmail, normalizePhone, toBoolean } from "./sanitize.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SERVICE_TYPES = new Set([
  "ambulatory",
  "wheelchair",
  "other",
]);

function required(value) {
  return cleanText(value).length > 0;
}

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeToMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function validateBookingInput(input = {}) {
  const errors = {};
  const passenger = {
    firstName: cleanText(input.firstName, 80),
    lastName: cleanText(input.lastName, 80),
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
  };

  const trip = {
    pickupDate: cleanText(input.pickupDate, 20),
    pickupTime: cleanText(input.pickupTime, 20),
    pickupAddress: cleanText(input.pickupAddress, 240),
    dropoffAddress: cleanText(input.dropoffAddress, 240),
    serviceType: cleanText(input.serviceType || "ambulatory", 40),
    appointmentTime: cleanText(input.appointmentTime, 40),
    returnTrip: toBoolean(input.returnTrip),
    notes: cleanText(input.notes, 1000),
  };

  const accessibility = {
    wheelchair: toBoolean(input.wheelchair),
  };

  if (!required(passenger.firstName)) errors.firstName = "First name is required.";
  if (!required(passenger.lastName)) errors.lastName = "Last name is required.";
  if (!required(passenger.phone)) errors.phone = "Phone number is required.";
  if (required(passenger.phone) && phoneDigits(passenger.phone).length !== 10) {
    errors.phone = "Phone number must be 10 digits.";
  }
  if (passenger.email && !EMAIL_PATTERN.test(passenger.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!required(trip.pickupDate)) errors.pickupDate = "Pickup date is required.";
  if (required(trip.pickupDate) && trip.pickupDate < todayString()) {
    errors.pickupDate = "Pickup date cannot be in the past.";
  }
  if (!required(trip.pickupTime)) errors.pickupTime = "Pickup time is required.";
  if (!required(trip.pickupAddress)) errors.pickupAddress = "Pickup address is required.";
  if (!required(trip.dropoffAddress)) errors.dropoffAddress = "Drop-off address is required.";
  if (!SERVICE_TYPES.has(trip.serviceType)) errors.serviceType = "Choose a valid service type.";
  if (trip.appointmentTime) {
    const pickupMinutes = timeToMinutes(trip.pickupTime);
    const appointmentMinutes = timeToMinutes(trip.appointmentTime);
    if (appointmentMinutes === null || (pickupMinutes !== null && appointmentMinutes <= pickupMinutes)) {
      errors.appointmentTime = "Appointment time must be after pickup time.";
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      passenger,
      trip,
      accessibility,
      consent: {
        acceptedTerms: toBoolean(input.acceptedTerms),
        contactPermission: true,
        smsUpdates: toBoolean(input.smsUpdates),
      },
    },
  };
}

export function validateStatusInput(input = {}) {
  const allowedStatuses = new Set([
    "pending",
    "needs_information",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
  ]);
  const status = cleanText(input.status, 40);

  if (!allowedStatuses.has(status)) {
    return {
      ok: false,
      error: "Invalid booking status.",
    };
  }

  return {
    ok: true,
    value: {
      status,
      note: cleanText(input.note, 800),
    },
  };
}
