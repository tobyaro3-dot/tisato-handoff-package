const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const dashboardMessage = document.getElementById("dashboardMessage");
const bookingTable = document.getElementById("bookingTable");
const metrics = document.getElementById("metrics");
const logoutButton = document.getElementById("logoutButton");
const refreshButton = document.getElementById("refreshButton");

const statuses = [
  "new_request",
  "contacted",
  "scheduled",
  "completed",
  "cancelled",
];

const statusLabels = {
  new_request: "New Request",
  contacted: "Contacted",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setLoginMessage(text, type = "") {
  loginMessage.textContent = text;
  loginMessage.className = `form-message ${type}`.trim();
}

function setDashboardMessage(text, type = "") {
  dashboardMessage.textContent = text;
  dashboardMessage.className = `form-message ${type}`.trim();
}

function setAuthed(isAuthed) {
  loginPanel.hidden = isAuthed;
  dashboardPanel.hidden = !isAuthed;
  logoutButton.hidden = !isAuthed;
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(result.error || "Request failed.");
  }
  return result;
}

function statusOptions(current) {
  const selectedStatus = statuses.includes(current) ? current : "new_request";
  return statuses
    .map((status) => `<option value="${status}" ${status === selectedStatus ? "selected" : ""}>${statusLabels[status]}</option>`)
    .join("");
}

function statusLabel(status) {
  return statusLabels[status] || statusLabels.new_request;
}

function formatTimestamp(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function renderMetrics(bookings) {
  const counts = bookings.reduce((accumulator, booking) => {
    accumulator[booking.status] = (accumulator[booking.status] || 0) + 1;
    return accumulator;
  }, {});

  metrics.innerHTML = [
    ["Total", bookings.length],
    ["New Request", counts.new_request || 0],
    ["Scheduled", counts.scheduled || 0],
    ["Completed", counts.completed || 0],
  ]
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderBookings(bookings) {
  if (!bookings.length) {
    bookingTable.innerHTML = "<p>No booking requests have been submitted yet.</p>";
    return;
  }

  bookingTable.innerHTML = bookings
    .map((booking) => {
      const passenger = booking.passenger || {};
      const trip = booking.trip || {};
      const passengerName = `${passenger.firstName || "Unknown"} ${passenger.lastName || "Passenger"}`;
      const status = statuses.includes(booking.status) ? booking.status : "new_request";
      return `
        <article class="booking-row" data-booking-id="${escapeHtml(booking.id)}">
          <div>
            <span class="status-pill">${escapeHtml(statusLabel(status))}</span>
            <h3>${escapeHtml(passengerName)}</h3>
            <div class="booking-meta">
              <span>${escapeHtml(booking.id)}</span>
              <span>${escapeHtml(passenger.phone)}</span>
              <span>${escapeHtml(trip.pickupDate)} ${escapeHtml(trip.pickupTime)}</span>
              <span>${escapeHtml(trip.serviceType)}</span>
              <span>Last updated: ${escapeHtml(formatTimestamp(booking.updatedAt))}</span>
            </div>
            <p><strong>Pickup:</strong> ${escapeHtml(trip.pickupAddress || "Not provided")}</p>
            <p><strong>Drop-off:</strong> ${escapeHtml(trip.dropoffAddress || "Not provided")}</p>
            <p>${escapeHtml(trip.notes || "No notes provided.")}</p>
          </div>
          <div class="row-actions">
            <label>
              Status
              <select data-status>${statusOptions(status)}</select>
            </label>
            <label>
              Admin note
              <textarea data-note rows="3" placeholder="Optional internal note"></textarea>
            </label>
            <button class="button primary" type="button" data-update>Update Booking</button>
          </div>
        </article>`;
    })
    .join("");
}

async function loadBookings() {
  setDashboardMessage("Loading bookings...");
  const result = await requestJson("/api/admin/bookings");
  renderMetrics(result.bookings);
  renderBookings(result.bookings);
  setDashboardMessage(`Loaded ${result.bookings.length} booking request(s).`, "success");
}

async function boot() {
  try {
    await requestJson("/api/admin/me");
    setAuthed(true);
    await loadBookings();
  } catch {
    setAuthed(false);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoginMessage("Checking credentials...");

  try {
    await requestJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(loginForm).entries())),
    });
    setLoginMessage("Logged in.", "success");
    setAuthed(true);
    await loadBookings();
  } catch (error) {
    setLoginMessage(error.message, "error");
  }
});

logoutButton.addEventListener("click", async () => {
  await requestJson("/api/admin/logout", { method: "POST", body: "{}" });
  setAuthed(false);
});

refreshButton.addEventListener("click", () => {
  loadBookings().catch((error) => setDashboardMessage(error.message, "error"));
});

bookingTable.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-update]");
  if (!button) return;

  const row = button.closest("[data-booking-id]");
  const bookingId = row.dataset.bookingId;
  const status = row.querySelector("[data-status]").value;
  const note = row.querySelector("[data-note]").value;

  button.disabled = true;
  setDashboardMessage(`Updating ${bookingId}...`);

  try {
    await requestJson(`/api/admin/bookings/${encodeURIComponent(bookingId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    });
    await loadBookings();
  } catch (error) {
    setDashboardMessage(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

boot();
