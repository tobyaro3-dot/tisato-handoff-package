import { config } from "../config.js";
import { escapeHtml } from "../utils/sanitize.js";

function layout({ title, preview, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #f5f1e8; color: #1d2320; }
    .wrap { max-width: 680px; margin: 0 auto; padding: 32px 18px; }
    .card { background: #fffaf0; border: 1px solid #dfd3bf; border-radius: 18px; overflow: hidden; }
    .head { background: #16352d; color: #fffaf0; padding: 26px; }
    .body { padding: 26px; line-height: 1.55; }
    .muted { color: #68736d; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    td { border-top: 1px solid #eadfce; padding: 10px 0; vertical-align: top; }
    td:first-child { color: #68736d; width: 180px; }
    .pill { display: inline-block; border-radius: 999px; background: #d8af5f; color: #1d2320; padding: 6px 12px; font-weight: 700; }
  </style>
</head>
<body>
  <span style="display:none">${escapeHtml(preview)}</span>
  <div class="wrap">
    <div class="card">
      <div class="head">
        <p style="margin:0 0 8px;letter-spacing:.16em;text-transform:uppercase;font-size:12px">${escapeHtml(config.businessName)}</p>
        <h1 style="margin:0;font-size:26px">${escapeHtml(title)}</h1>
      </div>
      <div class="body">${body}</div>
    </div>
  </div>
</body>
</html>`;
}

function tripRows(booking) {
  return `
    <tr><td>Passenger</td><td>${escapeHtml(booking.passenger.firstName)} ${escapeHtml(booking.passenger.lastName)}</td></tr>
    <tr><td>Phone</td><td>${escapeHtml(booking.passenger.phone)}</td></tr>
    <tr><td>Email</td><td>${escapeHtml(booking.passenger.email || "Not provided")}</td></tr>
    <tr><td>Pickup</td><td>${escapeHtml(booking.trip.pickupDate)} at ${escapeHtml(booking.trip.pickupTime)}</td></tr>
    <tr><td>Pickup address</td><td>${escapeHtml(booking.trip.pickupAddress)}</td></tr>
    <tr><td>Drop-off address</td><td>${escapeHtml(booking.trip.dropoffAddress)}</td></tr>
    <tr><td>Service type</td><td>${escapeHtml(booking.trip.serviceType)}</td></tr>
    <tr><td>Notes</td><td>${escapeHtml(booking.trip.notes || "None")}</td></tr>`;
}

export function dispatchBookingTemplate(booking) {
  const subject = `New TISATO booking request: ${booking.id}`;
  return {
    subject,
    html: layout({
      title: "New Booking Request",
      preview: `A new booking request is ready for our team review: ${booking.id}`,
      body: `
        <p><span class="pill">${escapeHtml(booking.status)}</span></p>
        <p>A new transportation request has been submitted and needs admin review.</p>
        <table>${tripRows(booking)}</table>
        <p class="muted">Booking ID: ${escapeHtml(booking.id)}</p>`,
    }),
  };
}

export function passengerConfirmationTemplate(booking) {
  const subject = `TISATO received your booking request: ${booking.id}`;
  return {
    subject,
    html: layout({
      title: "Booking Request Received",
      preview: "TISATO has received your transportation request.",
      body: `
        <p>Thank you, ${escapeHtml(booking.passenger.firstName)}. We received your request and our team will review the trip details.</p>
        <table>${tripRows(booking)}</table>
        <p class="muted">For immediate questions, call ${escapeHtml(config.dispatchPhone)} or email ${escapeHtml(config.dispatchEmail)}.</p>`,
    }),
  };
}

export function statusUpdateTemplate(booking) {
  const subject = `TISATO booking update: ${booking.id}`;
  return {
    subject,
    html: layout({
      title: "Booking Status Updated",
      preview: `Your booking is now ${booking.status}.`,
      body: `
        <p>Your booking status has been updated.</p>
        <p><span class="pill">${escapeHtml(booking.status)}</span></p>
        <table>${tripRows(booking)}</table>
        <p class="muted">Booking ID: ${escapeHtml(booking.id)}</p>`,
    }),
  };
}
