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

function isValidIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isValidMoneyText(value) {
  const text = cleanText(value, 40);
  return !text || /^\$?\d+(\.\d{1,2})?$/.test(text);
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
    email: normalizeEmail(input.email ?? input.customerEmail ?? input.patientEmail ?? input.passengerEmail),
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
    returnTime: cleanText(input.returnTime, 40),
    returnDetails: cleanText(input.returnDetails, 240),
    appointmentType: cleanText(input.appointmentType, 120),
    facilityName: cleanText(input.facilityName, 160),
    facilityAddress: cleanText(input.facilityAddress, 240),
    doctorName: cleanText(input.doctorName, 160),
    clinicName: cleanText(input.clinicName, 160),
    facilityPhone: normalizePhone(input.facilityPhone),
    specialInstructions: cleanText(input.specialInstructions, 1000),
    passengerCount: cleanText(input.passengerCount ?? input.numberOfPassengers, 20),
    numberOfPassengers: cleanText(input.numberOfPassengers ?? input.passengerCount, 20),
    companionRidingAlong: toBoolean(input.companionRidingAlong),
    caregiverRidingAlong: toBoolean(input.caregiverRidingAlong),
    notes: cleanText(input.notes, 1000),
  };

  const facilityEmail = normalizeEmail(input.facility?.facilityEmail ?? input.facilityEmail);
  const facility = {
    facilityName: cleanText(input.facility?.facilityName ?? input.facilityName, 160),
    facilityAddress: cleanText(input.facility?.facilityAddress ?? input.facilityAddress, 240),
    facilityContactPerson: cleanText(
      input.facility?.facilityContactPerson ?? input.facilityContactPerson,
      160
    ),
    facilityPhone: normalizePhone(input.facility?.facilityPhone ?? input.facilityPhone),
    facilityEmail,
    referralSource: cleanText(input.facility?.referralSource ?? input.referralSource, 160),
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
  if (facilityEmail && !EMAIL_PATTERN.test(facilityEmail)) {
    errors.facilityEmail = "Enter a valid facility email address.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      passenger,
      trip,
      facility,
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
    "request_received",
    "reviewing_details",
    "ride_confirmed",
    "driver_assigned",
    "on_the_way",
    "ride_completed",
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

export function validateRideArchiveInput(input = {}) {
  const allowedRideStatuses = new Set([
    "requested",
    "confirmed",
    "scheduled",
    "completed",
    "canceled",
    "no_show",
  ]);
  const allowedPaymentStatuses = new Set([
    "",
    "unpaid",
    "paid",
    "pending",
    "invoiced",
  ]);
  const allowedRecordStates = new Set([
    "",
    "active",
    "archived",
    "deleted",
  ]);

  const rideStatus = cleanText(input.rideDetails?.rideStatus ?? input.rideStatus, 40);
  const recordState = cleanText(input.rideDetails?.recordState ?? input.recordState, 40);
  const paymentStatus = cleanText(input.payment?.paymentStatus ?? input.paymentStatus, 40);
  const quotedPrice = cleanText(input.payment?.quotedPrice ?? input.quotedPrice, 40);
  const finalPrice = cleanText(input.payment?.finalPrice ?? input.finalPrice, 40);
  const facilityEmail = normalizeEmail(input.facility?.facilityEmail ?? input.facilityEmail);

  if (rideStatus && !allowedRideStatuses.has(rideStatus)) {
    return {
      ok: false,
      error: "Invalid ride archive status.",
    };
  }

  if (!allowedPaymentStatuses.has(paymentStatus)) {
    return {
      ok: false,
      error: "Invalid payment status.",
    };
  }

  if (!allowedRecordStates.has(recordState)) {
    return {
      ok: false,
      error: "Invalid record state.",
    };
  }

  if (!isValidMoneyText(quotedPrice) || !isValidMoneyText(finalPrice)) {
    return {
      ok: false,
      error: "Prices must be plain dollar amounts, such as 125 or 125.00.",
    };
  }

  if (facilityEmail && !EMAIL_PATTERN.test(facilityEmail)) {
    return {
      ok: false,
      error: "Enter a valid facility email address.",
    };
  }

  return {
    ok: true,
    value: {
      rideDetails: {
        rideStatus,
        rideType: cleanText(input.rideDetails?.rideType ?? input.rideType, 80),
        recordState,
      },
      payment: {
        quotedPrice,
        finalPrice,
        paymentStatus,
        paymentMethod: cleanText(input.payment?.paymentMethod ?? input.paymentMethod, 80),
      },
      facility: {
        facilityName: cleanText(input.facility?.facilityName ?? input.facilityName, 160),
        facilityContactPerson: cleanText(
          input.facility?.facilityContactPerson ?? input.facilityContactPerson,
          120,
        ),
        facilityPhone: normalizePhone(input.facility?.facilityPhone ?? input.facilityPhone),
        facilityEmail,
        referralSource: cleanText(input.facility?.referralSource ?? input.referralSource, 160),
      },
      operations: {
        assignedDriver: cleanText(input.operations?.assignedDriver ?? input.assignedDriver, 120),
        waitTime: cleanText(input.operations?.waitTime ?? input.waitTime, 80),
        internalNotes: cleanText(input.operations?.internalNotes ?? input.internalNotes, 1200),
      },
    },
  };
}

export function validateManualRideArchiveInput(input = {}) {
  const archiveValidation = validateRideArchiveInput(input);
  if (!archiveValidation.ok) return archiveValidation;

  const passenger = input.passenger || {};
  const tripInput = input.trip || {};
  const errors = {};

  const firstName = cleanText(passenger.firstName ?? input.firstName, 80);
  const lastName = cleanText(passenger.lastName ?? input.lastName, 80);
  const phone = normalizePhone(passenger.phone ?? input.phone);
  const email = normalizeEmail(passenger.email ?? input.email);
  const pickupAddress = cleanText(tripInput.pickupAddress ?? input.pickupAddress, 240);
  const dropoffAddress = cleanText(tripInput.dropoffAddress ?? input.dropoffAddress, 240);
  const pickupDate = cleanText(tripInput.pickupDate ?? input.pickupDate, 20);
  const pickupTime = cleanText(tripInput.pickupTime ?? input.pickupTime, 20);
  const appointmentTime = cleanText(tripInput.appointmentTime ?? input.appointmentTime, 40);
  const serviceType = cleanText(tripInput.serviceType ?? input.serviceType, 40);

  if (!required(firstName)) errors.firstName = "Passenger first name is required.";
  if (!required(lastName)) errors.lastName = "Passenger last name is required.";
  if (!phone && !email) errors.contact = "Passenger phone or email is required.";
  if (email && !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid passenger email address.";
  if (!required(pickupAddress)) errors.pickupAddress = "Pickup address is required.";
  if (!required(dropoffAddress)) errors.dropoffAddress = "Drop-off address is required.";
  if (!required(pickupDate)) errors.pickupDate = "Appointment date is required.";
  if (pickupDate && !isValidIsoDate(pickupDate)) errors.pickupDate = "Appointment date must use YYYY-MM-DD format.";
  if (serviceType && !SERVICE_TYPES.has(serviceType)) errors.serviceType = "Service type must be ambulatory, wheelchair, or other.";

  if (Object.keys(errors).length) {
    return {
      ok: false,
      error: "Manual ride entry is missing required fields.",
      errors,
    };
  }

  return {
    ok: true,
    value: {
      passenger: {
        firstName,
        lastName,
        phone,
        email,
      },
      trip: {
        pickupAddress,
        dropoffAddress,
        pickupDate,
        pickupTime,
        appointmentTime,
        serviceType: serviceType || "other",
        returnTrip: toBoolean(tripInput.returnTrip ?? input.returnTrip),
        notes: cleanText(tripInput.notes ?? input.notes, 1000),
      },
      accessibility: {
        wheelchair: toBoolean(input.accessibility?.wheelchair ?? input.wheelchair),
      },
      archive: archiveValidation.value,
    },
  };
}
