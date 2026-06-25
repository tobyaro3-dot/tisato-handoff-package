import nodemailer from "nodemailer";
import { config } from "../config.js";
import { escapeHtml } from "../utils/sanitize.js";

let transport;
let smtpSummaryLogged = false;

const NOT_PROVIDED = "Not provided";

function smtpCredentialsConfigured() {
  return Boolean(config.smtpHost && config.smtpPort && config.smtpUser && config.smtpPass);
}

export function getInternalNotificationRecipients() {
  return String(config.ceoNotificationEmails || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function internalNotificationConfigured() {
  return smtpCredentialsConfigured() && getInternalNotificationRecipients().length > 0;
}

export function getSmtpNotificationDiagnostics() {
  return {
    envLoaded: config.localEnvLoaded,
    smtpConfigPresent: {
      host: Boolean(config.smtpHost),
      port: Boolean(config.smtpPort),
      user: Boolean(config.smtpUser),
      pass: Boolean(config.smtpPass),
    },
    internalRecipientCount: getInternalNotificationRecipients().length,
  };
}

function logSmtpSummary() {
  if (smtpSummaryLogged) return;
  smtpSummaryLogged = true;
  console.info("[smtp-notification] SMTP environment summary.", getSmtpNotificationDiagnostics());
}

function getTransport() {
  if (!transport) {
    logSmtpSummary();
    transport = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }

  return transport;
}

function hasValue(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function fallback(value) {
  if (!hasValue(value)) return NOT_PROVIDED;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((item) => fallback(item)).join(", ");
  if (typeof value === "object") return formatObject(value);
  return String(value);
}

function formatObject(value) {
  if (!hasValue(value)) return NOT_PROVIDED;

  return Object.entries(value)
    .map(([key, entryValue]) => `${humanizeKey(key)}: ${fallback(entryValue)}`)
    .join("; ");
}

function humanizeKey(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizePath(path) {
  return path.join(".");
}

function markCovered(coveredPaths, paths) {
  paths.forEach((path) => coveredPaths.add(normalizePath(path)));
}

function sectionRows(fields) {
  return fields
    .map(
      ([label, value]) =>
        `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(fallback(value))}</td></tr>`
    )
    .join("");
}

function textRows(fields) {
  return fields.map(([label, value]) => `${label}: ${fallback(value)}`).join("\n");
}

function collectAdditionalFields(value, coveredPaths, path = []) {
  if (value == null || typeof value !== "object") return [];

  if (Array.isArray(value)) {
    const pathKey = normalizePath(path);
    return coveredPaths.has(pathKey) ? [] : [[humanizeKey(pathKey), value]];
  }

  return Object.entries(value).flatMap(([key, entryValue]) => {
    const nextPath = [...path, key];
    const pathKey = normalizePath(nextPath);
    if (coveredPaths.has(pathKey)) return [];

    if (entryValue && typeof entryValue === "object" && !Array.isArray(entryValue)) {
      const nested = collectAdditionalFields(entryValue, coveredPaths, nextPath);
      return nested.length ? nested : [[humanizeKey(pathKey), entryValue]];
    }

    return [[humanizeKey(pathKey), entryValue]];
  });
}

function passengerName(booking) {
  return `${booking.passenger?.firstName || ""} ${booking.passenger?.lastName || ""}`.trim();
}

function tripType(booking) {
  return booking.trip?.returnTrip ? "Round trip requested" : "One-way";
}

function mobilityType(booking) {
  const mobilityParts = [booking.trip?.serviceType].filter(Boolean);
  if (booking.accessibility?.wheelchair) mobilityParts.push("Wheelchair");
  return mobilityParts.length ? mobilityParts.join(" / ") : NOT_PROVIDED;
}

function preferredContactMethod(booking) {
  if (booking.consent?.smsUpdatesOptIn || booking.consent?.smsUpdates) return "SMS and phone/email";
  if (booking.passenger?.email && booking.passenger?.phone) return "Phone or email";
  if (booking.passenger?.phone) return "Phone";
  if (booking.passenger?.email) return "Email";
  return NOT_PROVIDED;
}

function resolveCustomerEmail(booking) {
  if (booking.passenger?.email) {
    return {
      email: booking.passenger.email,
      fieldName: "passenger.email",
    };
  }

  for (const fieldName of ["email", "customerEmail", "patientEmail", "passengerEmail"]) {
    if (booking[fieldName]) {
      return {
        email: booking[fieldName],
        fieldName,
      };
    }
  }

  return {
    email: "",
    fieldName: "not_found",
  };
}

export function getCustomerEmailDiagnostics(booking) {
  const customerEmail = resolveCustomerEmail(booking);
  return {
    customerEmailPresent: Boolean(customerEmail.email),
    customerEmailFieldName: customerEmail.fieldName,
  };
}

function adminNotesText(adminNotes) {
  if (!Array.isArray(adminNotes) || !adminNotes.length) return NOT_PROVIDED;
  return adminNotes
    .map((note) => {
      if (typeof note === "string") return note;
      return [note.body, note.author, note.createdAt].filter(Boolean).join(" | ");
    })
    .filter(Boolean)
    .join("\n");
}

function internalSections(booking) {
  const coveredPaths = new Set();

  markCovered(coveredPaths, [
    ["id"],
    ["createdAt"],
    ["status"],
    ["source"],
    ["passenger", "firstName"],
    ["passenger", "lastName"],
    ["passenger", "phone"],
    ["passenger", "email"],
    ["consent", "smsUpdatesOptIn"],
    ["consent", "smsUpdates"],
    ["trip", "pickupDate"],
    ["trip", "appointmentTime"],
    ["trip", "pickupTime"],
    ["trip", "pickupAddress"],
    ["trip", "dropoffAddress"],
    ["trip", "returnTrip"],
    ["trip", "serviceType"],
    ["accessibility", "wheelchair"],
    ["trip", "passengerCount"],
    ["trip", "numberOfPassengers"],
    ["trip", "companionRidingAlong"],
    ["trip", "caregiverRidingAlong"],
    ["trip", "appointmentType"],
    ["trip", "facilityName"],
    ["trip", "doctorName"],
    ["trip", "clinicName"],
    ["trip", "facilityPhone"],
    ["trip", "specialInstructions"],
    ["trip", "notes"],
    ["adminNotes"],
  ]);

  const sections = [
    {
      title: "SECTION 1: Booking Details",
      fields: [
        ["Booking ID", booking.id],
        ["Submitted At", booking.createdAt],
        ["Status", booking.status],
        ["Source", booking.source],
      ],
    },
    {
      title: "SECTION 2: Passenger / Customer Information",
      fields: [
        ["Full Name", passengerName(booking)],
        ["Phone Number", booking.passenger?.phone],
        ["Email Address", booking.passenger?.email],
        ["Preferred Contact Method", preferredContactMethod(booking)],
      ],
    },
    {
      title: "SECTION 3: Trip Details",
      fields: [
        ["Appointment Date", booking.trip?.pickupDate],
        ["Appointment Time", booking.trip?.appointmentTime || booking.trip?.pickupTime],
        ["Pickup Address", booking.trip?.pickupAddress],
        ["Drop-off Address", booking.trip?.dropoffAddress],
        ["Return Trip Needed", booking.trip?.returnTrip],
        ["Trip Type", tripType(booking)],
        ["Mobility Type", mobilityType(booking)],
        ["Wheelchair Needed", booking.accessibility?.wheelchair],
        ["Ambulatory / Wheelchair details", booking.trip?.serviceType],
        [
          "Number of Passengers",
          booking.trip?.numberOfPassengers || booking.trip?.passengerCount,
        ],
        [
          "Companion / Caregiver Riding Along",
          booking.trip?.companionRidingAlong || booking.trip?.caregiverRidingAlong,
        ],
      ],
    },
    {
      title: "SECTION 4: Medical / Facility Details",
      fields: [
        ["Appointment Type", booking.trip?.appointmentType],
        ["Facility Name", booking.trip?.facilityName],
        ["Doctor / Clinic Name", booking.trip?.doctorName || booking.trip?.clinicName],
        ["Facility Phone Number", booking.trip?.facilityPhone],
        ["Special Instructions", booking.trip?.specialInstructions],
      ],
    },
    {
      title: "SECTION 5: Notes",
      fields: [
        ["Customer Notes", booking.trip?.notes],
        ["Internal Notes", adminNotesText(booking.adminNotes)],
      ],
    },
  ];

  const additionalFields = collectAdditionalFields(booking, coveredPaths);
  if (additionalFields.length) {
    sections.push({
      title: "Additional Submitted Fields",
      fields: additionalFields,
    });
  }

  return sections;
}

function customerSummaryDetails(booking) {
  return [
    ["Booking ID", booking.id],
    ["Appointment Date", booking.trip?.pickupDate],
    ["Appointment Time", booking.trip?.appointmentTime || booking.trip?.pickupTime],
    ["Pickup Address", booking.trip?.pickupAddress],
    ["Drop-off Address", booking.trip?.dropoffAddress],
    ["Trip Type", tripType(booking)],
  ];
}

function renderInternalTextEmail(booking) {
  return internalSections(booking)
    .map((section) => `${section.title}\n${textRows(section.fields)}`)
    .join("\n\n");
}

function renderInternalHtmlEmail(booking) {
  const sections = internalSections(booking)
    .map(
      (section) => `
        <section>
          <h2>${escapeHtml(section.title)}</h2>
          <table>${sectionRows(section.fields)}</table>
        </section>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>New Ride Request - TISATO - ${escapeHtml(booking.id)}</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #f7f1fb; color: #171321; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 28px 18px; }
    .card { background: #fffaf0; border: 1px solid #dfd0e8; border-radius: 18px; overflow: hidden; }
    .head { background: #3d1a78; color: #fffaf0; padding: 24px; }
    .body { padding: 24px; }
    section + section { margin-top: 28px; }
    h2 { color: #3d1a78; font-size: 16px; letter-spacing: .06em; margin: 0 0 10px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    td { border-top: 1px solid #eadff1; padding: 11px 0; vertical-align: top; }
    td:first-child { color: #665f73; font-weight: 700; width: 240px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="head">
        <p style="margin:0 0 8px;letter-spacing:.16em;text-transform:uppercase;font-size:12px">TISATO Transportation Services INC</p>
        <h1 style="margin:0;font-size:26px">New Ride Request</h1>
        <p style="margin:8px 0 0">Booking ID: ${escapeHtml(fallback(booking.id))}</p>
      </div>
      <div class="body">
        <p>A new ride request was submitted and saved to the admin dashboard.</p>
        ${sections}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function renderCustomerTextEmail(booking) {
  const customerName = passengerName(booking) || "there";
  const summary = customerSummaryDetails(booking)
    .map(([label, value]) => `* ${label}: ${fallback(value)}`)
    .join("\n");

  return `Hello ${customerName},

Thank you for contacting TISATO Transportation Services.

We have received your transportation request and a member of our team will review the details shortly.

Request Summary:

${summary}

If we need additional information, we will contact you.

Thank you for choosing TISATO Transportation Services.

Safe travels,

TISATO Transportation Services
844-884-7286
www.tisatotransportationservices.com`;
}

function renderCustomerHtmlEmail(booking) {
  const customerName = passengerName(booking) || "there";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>TISATO Ride Request Received</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #f7f1fb; color: #171321; }
    .wrap { max-width: 680px; margin: 0 auto; padding: 28px 18px; }
    .card { background: #fffaf0; border: 1px solid #dfd0e8; border-radius: 18px; overflow: hidden; }
    .head { background: #3d1a78; color: #fffaf0; padding: 24px; }
    .body { padding: 24px; line-height: 1.58; }
    table { width: 100%; border-collapse: collapse; margin: 18px 0; }
    td { border-top: 1px solid #eadff1; padding: 11px 0; vertical-align: top; }
    td:first-child { color: #665f73; font-weight: 700; width: 190px; }
    a { color: #3d1a78; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="head">
        <p style="margin:0 0 8px;letter-spacing:.16em;text-transform:uppercase;font-size:12px">TISATO Transportation Services INC</p>
        <h1 style="margin:0;font-size:26px">Ride Request Received</h1>
      </div>
      <div class="body">
        <p>Hello ${escapeHtml(customerName)},</p>
        <p>Thank you for contacting TISATO Transportation Services.</p>
        <p>We have received your transportation request and a member of our team will review the details shortly.</p>
        <p><strong>Request Summary:</strong></p>
        <table>${sectionRows(customerSummaryDetails(booking))}</table>
        <p>If we need additional information, we will contact you.</p>
        <p>Thank you for choosing TISATO Transportation Services.</p>
        <p>
          Safe travels,<br>
          TISATO Transportation Services<br>
          844-884-7286<br>
          <a href="https://www.tisatotransportationservices.com">www.tisatotransportationservices.com</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendCeoRideRequestNotification(booking) {
  logSmtpSummary();
  const recipients = getInternalNotificationRecipients();

  if (!internalNotificationConfigured()) {
    console.warn("[smtp-notification] SMTP configuration incomplete; internal notification skipped.", {
      bookingId: booking.id,
      internalRecipientCount: recipients.length,
    });
    return { sent: 0, failed: 0, skipped: true };
  }

  console.info("[smtp-notification] Internal ride request notification attempted.", {
    bookingId: booking.id,
    internalRecipientCount: recipients.length,
  });

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      await getTransport().sendMail({
        from: `"TISATO Ride Requests" <${config.smtpUser}>`,
        to: recipient,
        subject: `New Ride Request - TISATO - ${booking.id}`,
        text: renderInternalTextEmail(booking),
        html: renderInternalHtmlEmail(booking),
      });
      sent += 1;
      console.info("[smtp-notification] Internal ride request notification sent.", {
        bookingId: booking.id,
        sent,
        failed,
      });
    } catch (error) {
      failed += 1;
      console.error("[smtp-notification] Failed to send internal ride request notification.", {
        bookingId: booking.id,
        code: error?.code || null,
        command: error?.command || null,
        message: error?.message || "Unknown SMTP error",
      });
    }
  }

  console.info("[smtp-notification] Internal ride request notification complete.", {
    bookingId: booking.id,
    notified: sent,
    failed,
  });

  return { sent, failed, skipped: false };
}

export async function sendCustomerRideRequestConfirmation(booking) {
  logSmtpSummary();
  const customerEmail = resolveCustomerEmail(booking);
  const customerEmailDiagnostics = getCustomerEmailDiagnostics(booking);

  console.info("[smtp-notification] Customer email diagnostics.", {
    bookingId: booking.id,
    ...customerEmailDiagnostics,
  });

  if (!customerEmail.email) {
    console.info("[smtp-notification] Customer email missing; confirmation skipped.", {
      bookingId: booking.id,
      customerEmailPresent: false,
      customerConfirmationAttempted: false,
    });
    return { sent: false, skipped: true, attempted: false };
  }

  if (!smtpCredentialsConfigured()) {
    console.warn("[smtp-notification] SMTP configuration incomplete; customer confirmation skipped.", {
      bookingId: booking.id,
      customerEmailPresent: true,
      customerConfirmationAttempted: false,
    });
    return { sent: false, skipped: true, attempted: false };
  }

  console.info("[smtp-notification] Customer ride request confirmation attempted.", {
    bookingId: booking.id,
    customerEmailPresent: true,
    customerConfirmationAttempted: true,
  });

  try {
    const info = await getTransport().sendMail({
      from: `"TISATO Transportation Services" <${config.smtpUser}>`,
      to: customerEmail.email,
      subject: "TISATO Ride Request Received",
      text: renderCustomerTextEmail(booking),
      html: renderCustomerHtmlEmail(booking),
    });

    console.info("[smtp-notification] Customer ride request confirmation sent.", {
      bookingId: booking.id,
      customerConfirmationSent: true,
      messageId: info.messageId,
    });
    return { sent: true, skipped: false, attempted: true };
  } catch (error) {
    console.error("[smtp-notification] Failed to send customer ride request confirmation.", {
      bookingId: booking.id,
      customerConfirmationSent: false,
      code: error?.code || null,
      command: error?.command || null,
      message: error?.message || "Unknown SMTP error",
    });
    return { sent: false, skipped: false, attempted: true };
  }
}
