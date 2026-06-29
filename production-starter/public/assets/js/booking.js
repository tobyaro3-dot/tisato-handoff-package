const form = document.getElementById("bookingForm");
const message = document.getElementById("bookingMessage");
const pickupDateInput = form?.elements.pickupDate;
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

function todayString() {
  const parts = formatterParts(serviceDateFormatter, new Date());
  const year = parts.year;
  const month = parts.month;
  const day = parts.day;
  return `${year}-${month}-${day}`;
}

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
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

function isValidName(value) {
  const text = String(value || "").trim();
  const letters = text.match(/\p{L}/gu) || [];
  return letters.length >= 2 && /^[\p{L}\s'\u2019-]+$/u.test(text);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function fieldErrorElement(name) {
  return form.querySelector(`[data-field-error="${name}"]`);
}

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `form-message ${type}`.trim();
}

function setFieldError(name, text = "") {
  const field = form.elements[name];
  const error = fieldErrorElement(name);

  if (field) {
    field.classList.toggle("is-invalid", Boolean(text));
    field.setAttribute("aria-invalid", String(Boolean(text)));
  }

  if (error) {
    error.textContent = text;
  }
}

function clearFieldErrors() {
  [
    "firstName",
    "lastName",
    "email",
    "phone",
    "pickupDate",
    "pickupTime",
    "pickupAddress",
    "dropoffAddress",
    "serviceType",
    "appointmentTime",
  ].forEach((name) => setFieldError(name));
}

function validateForm() {
  const errors = {};
  const today = todayString();
  const firstName = form.elements.firstName?.value || "";
  const lastName = form.elements.lastName?.value || "";
  const email = form.elements.email?.value || "";
  const pickupDate = form.elements.pickupDate?.value || "";
  const pickupTime = form.elements.pickupTime?.value || "";
  const pickupAddress = form.elements.pickupAddress?.value || "";
  const dropoffAddress = form.elements.dropoffAddress?.value || "";
  const serviceType = form.elements.serviceType?.value || "";
  const appointmentTime = form.elements.appointmentTime?.value || "";
  const pickupDateTime = buildDateTime(pickupDate, pickupTime);
  const appointmentDateTime = buildDateTime(pickupDate, appointmentTime);

  if (!isValidName(firstName)) {
    errors.firstName = "First name must contain at least 2 letters.";
  }

  if (!isValidName(lastName)) {
    errors.lastName = "Last name must contain at least 2 letters.";
  }

  if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (phoneDigits(form.elements.phone?.value).length !== 10) {
    errors.phone = "Phone number must contain 10 digits.";
  }

  if (!pickupDate) {
    errors.pickupDate = "Pickup date is required.";
  } else if (pickupDate < today) {
    errors.pickupDate = "Pickup date cannot be in the past.";
  }

  if (pickupDateTime === null) {
    errors.pickupTime = "Pickup time is required.";
  } else if (pickupDateTime < new Date()) {
    errors.pickupTime = "Pickup time must be later than the current time.";
  }

  if (!pickupAddress.trim()) {
    errors.pickupAddress = "Pickup address is required.";
  }

  if (!dropoffAddress.trim()) {
    errors.dropoffAddress = "Drop-off address is required.";
  }

  if (!serviceType) {
    errors.serviceType = "Please select a service type.";
  }

  if (appointmentDateTime === null) {
    errors.appointmentTime = "Appointment time must be after pickup time.";
  } else if (pickupDateTime !== null && appointmentDateTime <= pickupDateTime) {
    errors.appointmentTime = "Appointment time must be after pickup time.";
  }

  clearFieldErrors();
  Object.entries(errors).forEach(([name, text]) => setFieldError(name, text));
  return errors;
}

function formPayload(formElement) {
  const data = Object.fromEntries(new FormData(formElement).entries());
  for (const field of ["returnTrip", "wheelchair", "smsUpdatesOptIn"]) {
    data[field] = Boolean(formElement.elements[field]?.checked);
  }
  return data;
}

function formatErrors(errors = {}) {
  const values = Object.values(errors);
  return values.length ? "Please review the highlighted fields above." : "Please check the form and try again.";
}

function openNativePicker(input) {
  if (!input || typeof input.showPicker !== "function") {
    input?.focus();
    return;
  }

  try {
    input.focus();
    input.showPicker();
  } catch (error) {
    input.focus();
  }
}

if (pickupDateInput) {
  pickupDateInput.min = todayString();
}

["pickupDate", "pickupTime", "appointmentTime"].forEach((name) => {
  const input = form.elements[name];
  input?.addEventListener("click", () => openNativePicker(input));
});

[
  "firstName",
  "lastName",
  "email",
  "phone",
  "pickupDate",
  "pickupTime",
  "pickupAddress",
  "dropoffAddress",
  "serviceType",
  "appointmentTime",
].forEach((name) => {
  form.elements[name]?.addEventListener("input", () => {
    validateForm();
  });
  form.elements[name]?.addEventListener("change", () => {
    validateForm();
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const errors = validateForm();
  if (Object.keys(errors).length) {
    setMessage(formatErrors(errors), "error");
    return;
  }

  setMessage("Submitting request...");

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formPayload(form)),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.error || formatErrors(result.errors), "error");
      return;
    }

    setMessage("Request received. Redirecting...", "success");
    window.location.href = `/thank-you?bookingId=${encodeURIComponent(result.bookingId)}`;
  } catch (error) {
    console.error(error);
    setMessage("The request could not be submitted. Please call our team directly.", "error");
  }
});
