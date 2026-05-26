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

function isValidName(value) {
  const text = cleanText(value, 80);
  const letters = text.match(/\p{L}/gu) || [];
  return letters.length >= 2 && /^[\p{L}\s'\u2019-]+$/u.test(text);
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

function currentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
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
    serviceType: cleanText(input.serviceType, 40),
    appointmentTime: cleanText(input.appointmentTime, 40),
    returnTrip: toBoolean(input.returnTrip),
    notes: cleanText(input.notes, 1000),
  };

  const accessibility = {
    wheelchair: toBoolean(input.wheelchair),
  };

  const today = todayString();
  const pickupMinutes = timeToMinutes(trip.pickupTime);
  const appointmentMinutes = timeToMinutes(trip.appointmentTime);
  const isToday = trip.pickupDate === today;
  const smsUpdatesOptIn = toBoolean(input.smsUpdatesOptIn ?? input.smsUpdates);

  if (!isValidName(passenger.firstName)) {
    errors.firstName = "First name must contain at least 2 letters.";
  }
  if (!isValidName(passenger.lastName)) {
    errors.lastName = "Last name must contain at least 2 letters.";
  }
  if (!required(passenger.email)) {
    errors.email = "Enter a valid email address.";
  } else if (!EMAIL_PATTERN.test(passenger.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!required(passenger.phone)) errors.phone = "Phone number is required.";
  if (required(passenger.phone) && phoneDigits(passenger.phone).length !== 10) {
    errors.phone = "Phone number must contain 10 digits.";
  }
  if (!required(trip.pickupDate)) errors.pickupDate = "Pickup date is required.";
  if (required(trip.pickupDate) && trip.pickupDate < today) {
    errors.pickupDate = "Pickup date cannot be in the past.";
  }
  if (!required(trip.pickupTime) || pickupMinutes === null) {
    errors.pickupTime = "Pickup time is required.";
  } else if (isToday && pickupMinutes <= currentMinutes()) {
    errors.pickupTime = "Pickup time must be later than the current time.";
  }
  if (!required(trip.pickupAddress)) errors.pickupAddress = "Pickup address is required.";
  if (!required(trip.dropoffAddress)) errors.dropoffAddress = "Drop-off address is required.";
  if (!SERVICE_TYPES.has(trip.serviceType)) errors.serviceType = "Please select a service type.";
  if (!required(trip.appointmentTime) || appointmentMinutes === null) {
    errors.appointmentTime = "Appointment time must be after pickup time.";
  } else if (
    (pickupMinutes !== null && appointmentMinutes <= pickupMinutes) ||
    (isToday && appointmentMinutes <= currentMinutes())
  ) {
    errors.appointmentTime = "Appointment time must be after pickup time.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      passenger,
      trip,
      accessibility,
      consent: {
        contactPermission: true,
        smsUpdatesOptIn,
        smsUpdates: smsUpdatesOptIn,
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
