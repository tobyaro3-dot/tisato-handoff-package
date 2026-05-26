import { cleanText, normalizeEmail, normalizePhone, toBoolean } from "./sanitize.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SERVICE_TYPES = new Set([
  "ambulatory",
  "wheelchair",
  "other",
]);
const SERVICE_TIME_ZONE = "America/New_York";

const serviceDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SERVICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const serviceDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SERVICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatterParts(formatter, date) {
  return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
}

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
  const parts = formatterParts(serviceDateFormatter, new Date());
  const year = parts.year;
  const month = parts.month;
  const day = parts.day;
  return `${year}-${month}-${day}`;
}

function parseTimeParts(value) {
  const time = String(value || "").trim();
  const nativeMatch = /^(\d{1,2}):(\d{2})$/.exec(time);
  const amPmMatch = /^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i.exec(time);
  const match = nativeMatch || amPmMatch;
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59) return null;

  if (amPmMatch) {
    const period = match[3].toLowerCase();
    if (hours < 1 || hours > 12) return null;
    if (period === "a" && hours === 12) hours = 0;
    if (period === "p" && hours !== 12) hours += 12;
  } else if (hours > 23) {
    return null;
  }

  return { hours, minutes };
}

function buildDateTime(dateValue, timeValue) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ""));
  const timeParts = parseTimeParts(timeValue);
  if (!dateMatch || !timeParts) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const utcGuess = Date.UTC(year, month - 1, day, timeParts.hours, timeParts.minutes, 0, 0);
  const offsetParts = formatterParts(serviceDateTimeFormatter, new Date(utcGuess));
  const offsetWallTime = Date.UTC(
    Number(offsetParts.year),
    Number(offsetParts.month) - 1,
    Number(offsetParts.day),
    Number(offsetParts.hour),
    Number(offsetParts.minute),
    0,
    0,
  );
  const date = new Date(utcGuess - (offsetWallTime - utcGuess));
  const serviceParts = formatterParts(serviceDateTimeFormatter, date);

  if (
    Number(serviceParts.year) !== year ||
    Number(serviceParts.month) !== month ||
    Number(serviceParts.day) !== day ||
    Number(serviceParts.hour) !== timeParts.hours ||
    Number(serviceParts.minute) !== timeParts.minutes
  ) {
    return null;
  }

  return date;
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
  const pickupDateTime = buildDateTime(trip.pickupDate, trip.pickupTime);
  const appointmentDateTime = buildDateTime(trip.pickupDate, trip.appointmentTime);
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
  if (!required(trip.pickupTime) || pickupDateTime === null) {
    errors.pickupTime = "Pickup time is required.";
  } else if (pickupDateTime < new Date()) {
    errors.pickupTime = "Pickup time must be later than the current time.";
  }
  if (!required(trip.pickupAddress)) errors.pickupAddress = "Pickup address is required.";
  if (!required(trip.dropoffAddress)) errors.dropoffAddress = "Drop-off address is required.";
  if (!SERVICE_TYPES.has(trip.serviceType)) errors.serviceType = "Please select a service type.";
  if (!required(trip.appointmentTime) || appointmentDateTime === null) {
    errors.appointmentTime = "Appointment time must be after pickup time.";
  } else if (pickupDateTime !== null && appointmentDateTime <= pickupDateTime) {
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
