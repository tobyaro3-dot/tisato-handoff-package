const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const dashboardMessage = document.getElementById("dashboardMessage");
const bookingTable = document.getElementById("bookingTable");
const customerList = document.getElementById("customerList");
const customerDetail = document.getElementById("customerDetail");
const metrics = document.getElementById("metrics");
const logoutButton = document.getElementById("logoutButton");
const refreshButton = document.getElementById("refreshButton");
const adminSectionLinks = document.querySelectorAll("[data-admin-section-link]");
const adminSections = document.querySelectorAll(".admin-section");
const rideArchiveTable = document.getElementById("rideArchiveTable");
const rideArchiveSummary = document.getElementById("rideArchiveSummary");
const rideArchiveSearch = document.getElementById("rideArchiveSearch");
const rideArchiveDateFilter = document.getElementById("rideArchiveDateFilter");
const rideArchiveStatusFilter = document.getElementById("rideArchiveStatusFilter");
const rideArchivePaymentFilter = document.getElementById("rideArchivePaymentFilter");
const rideArchiveTypeFilter = document.getElementById("rideArchiveTypeFilter");
const rideArchiveFacilityFilter = document.getElementById("rideArchiveFacilityFilter");
const rideArchiveCityFilter = document.getElementById("rideArchiveCityFilter");
const rideArchiveShowDeleted = document.getElementById("rideArchiveShowDeleted");
const exportRideArchiveButton = document.getElementById("exportRideArchiveButton");
const rideArchiveEditPanel = document.getElementById("rideArchiveEditPanel");
const rideArchiveEditForm = document.getElementById("rideArchiveEditForm");
const rideArchiveEditTitle = document.getElementById("rideArchiveEditTitle");
const rideArchiveEditMessage = document.getElementById("rideArchiveEditMessage");
const rideArchiveAuditTimeline = document.getElementById("rideArchiveAuditTimeline");
const cancelRideArchiveEditButton = document.getElementById("cancelRideArchiveEditButton");
const addRideArchiveButton = document.getElementById("addRideArchiveButton");
const manualRidePanel = document.getElementById("manualRidePanel");
const manualRideForm = document.getElementById("manualRideForm");
const manualRideMessage = document.getElementById("manualRideMessage");
const cancelManualRideButton = document.getElementById("cancelManualRideButton");
const analyticsPeriod = document.getElementById("analyticsPeriod");
const analyticsStartDate = document.getElementById("analyticsStartDate");
const analyticsEndDate = document.getElementById("analyticsEndDate");
const refreshAnalyticsButton = document.getElementById("refreshAnalyticsButton");
const analyticsRange = document.getElementById("analyticsRange");
const analyticsMetrics = document.getElementById("analyticsMetrics");
const analyticsByStatus = document.getElementById("analyticsByStatus");
const analyticsByServiceType = document.getElementById("analyticsByServiceType");
const analyticsByMobility = document.getElementById("analyticsByMobility");
const analyticsTopFacilities = document.getElementById("analyticsTopFacilities");
const analyticsTopReferralSources = document.getElementById("analyticsTopReferralSources");
const analyticsTopCities = document.getElementById("analyticsTopCities");
const adminGlobalSearch = document.getElementById("adminGlobalSearch");
const adminGlobalSearchResults = document.getElementById("adminGlobalSearchResults");

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

let currentCustomers = [];
let currentRideArchive = [];
let visibleRideArchive = [];

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

function showAdminSection(sectionId) {
  adminSections.forEach((section) => {
    section.hidden = section.id !== sectionId;
  });

  adminSectionLinks.forEach((link) => {
    const active = link.dataset.adminSectionLink === sectionId;
    link.classList.toggle("active", active);
    if (link.tagName === "BUTTON") {
      link.setAttribute("aria-pressed", String(active));
    }
  });
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
    const details = result.errors
      ? ` ${Object.values(result.errors).filter(Boolean).join(" ")}`
      : "";
    throw new Error(`${result.error || "Request failed."}${details}`.trim());
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

function formatMoney(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString([], {
    style: "currency",
    currency: "USD",
  });
}

function normalizeFilterValue(value) {
  return String(value ?? "").trim();
}

function notProvided(value) {
  const normalized = normalizeFilterValue(value);
  return normalized || "Not provided";
}

function compactComparable(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sameDay(value, expected) {
  return normalizeFilterValue(value) && normalizeFilterValue(value) === normalizeFilterValue(expected);
}

function similarTime(left, right) {
  if (!left || !right) return false;
  const [leftHour, leftMinute] = String(left).split(":").map(Number);
  const [rightHour, rightMinute] = String(right).split(":").map(Number);
  if (![leftHour, leftMinute, rightHour, rightMinute].every(Number.isFinite)) return left === right;
  return Math.abs((leftHour * 60 + leftMinute) - (rightHour * 60 + rightMinute)) <= 45;
}

function similarAddress(left, right) {
  const a = compactComparable(left);
  const b = compactComparable(right);
  if (!a || !b) return false;
  return a.includes(b.slice(0, 16)) || b.includes(a.slice(0, 16));
}

function uniqueOptions(records, key) {
  return Array.from(
    new Set(records.map((record) => normalizeFilterValue(record[key])).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));
}

function setSelectOptions(select, values, allLabel) {
  if (!select) return;

  const current = select.value;
  select.innerHTML = [
    `<option value="">${escapeHtml(allLabel)}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
  ].join("");
  if (values.includes(current)) select.value = current;
}

function rideSearchText(ride) {
  return [
    ride.id,
    ride.customerId,
    ride.passengerName,
    ride.passengerPhone,
    ride.passengerEmail,
    ride.pickupAddress,
    ride.dropoffAddress,
    ride.statusLabel,
    ride.paymentStatus,
    ride.rideType,
    ride.serviceType,
    ride.mobilityType,
    ride.facilityName,
    ride.city,
    ride.referralSource,
    ride.assignedDriver,
    ride.notes,
    ride.internalAdminNotes,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");
}

function updateRideArchiveFilterOptions(records) {
  setSelectOptions(rideArchiveStatusFilter, uniqueOptions(records, "statusLabel"), "All statuses");
  setSelectOptions(rideArchivePaymentFilter, uniqueOptions(records, "paymentStatus"), "All payments");
  setSelectOptions(rideArchiveTypeFilter, uniqueOptions(records, "serviceType"), "All ride types");
  setSelectOptions(rideArchiveFacilityFilter, uniqueOptions(records, "facilityName"), "All facilities");
  setSelectOptions(rideArchiveCityFilter, uniqueOptions(records, "city"), "All cities");
}

function filteredRideArchive() {
  const search = normalizeFilterValue(rideArchiveSearch?.value).toLowerCase();
  const date = normalizeFilterValue(rideArchiveDateFilter?.value);
  const status = normalizeFilterValue(rideArchiveStatusFilter?.value);
  const payment = normalizeFilterValue(rideArchivePaymentFilter?.value);
  const type = normalizeFilterValue(rideArchiveTypeFilter?.value);
  const facility = normalizeFilterValue(rideArchiveFacilityFilter?.value);
  const city = normalizeFilterValue(rideArchiveCityFilter?.value);

  return currentRideArchive.filter((ride) => {
    if (search && !rideSearchText(ride).includes(search)) return false;
    if (date && ride.appointmentDate !== date) return false;
    if (status && ride.statusLabel !== status) return false;
    if (payment && ride.paymentStatus !== payment) return false;
    if (type && ride.serviceType !== type) return false;
    if (facility && ride.facilityName !== facility) return false;
    if (city && ride.city !== city) return false;
    return true;
  });
}

function renderRideArchive() {
  if (!rideArchiveTable) return;

  visibleRideArchive = filteredRideArchive();
  rideArchiveSummary.innerHTML = `
    <span>${escapeHtml(visibleRideArchive.length)} visible ride(s)</span>
    <span>${escapeHtml(currentRideArchive.length)} total archived booking(s)</span>
  `;

  if (!currentRideArchive.length) {
    rideArchiveTable.innerHTML = `<tr><td colspan="12">No rides have been archived yet.</td></tr>`;
    return;
  }

  if (!visibleRideArchive.length) {
    rideArchiveTable.innerHTML = `<tr><td colspan="12">No rides match the current filters.</td></tr>`;
    return;
  }

  rideArchiveTable.innerHTML = visibleRideArchive
    .map(
      (ride) => `
        <tr>
          <td>${escapeHtml(ride.id)}</td>
          <td>
            <strong>${escapeHtml(ride.passengerName)}</strong>
            <span>${escapeHtml(notProvided(ride.passengerPhone))}</span>
          </td>
          <td>${escapeHtml(notProvided(ride.appointmentDate))}</td>
          <td>${escapeHtml(notProvided(ride.appointmentTime))}</td>
          <td>
            <span class="status-pill">${escapeHtml(notProvided(ride.statusLabel))}</span>
            ${ride.recordState !== "active" ? `<span>${escapeHtml(ride.recordState)}</span>` : ""}
          </td>
          <td>${escapeHtml(notProvided(ride.serviceType || ride.rideType))}</td>
          <td>${escapeHtml(notProvided(ride.paymentStatus))}</td>
          <td>${escapeHtml(notProvided(ride.facilityName))}</td>
          <td>${escapeHtml(notProvided(ride.city))}</td>
          <td>${escapeHtml(notProvided(ride.pickupAddress))}</td>
          <td>${escapeHtml(notProvided(ride.dropoffAddress))}</td>
          <td>
            <button class="button ghost small" type="button" data-archive-edit="${escapeHtml(ride.id)}">Edit</button>
          </td>
        </tr>`
    )
    .join("");
}

function setRideArchiveEditMessage(text, type = "") {
  if (!rideArchiveEditMessage) return;
  rideArchiveEditMessage.textContent = text;
  rideArchiveEditMessage.className = `form-message ${type}`.trim();
}

function setManualRideMessage(text, type = "") {
  if (!manualRideMessage) return;
  manualRideMessage.textContent = text;
  manualRideMessage.className = `form-message ${type}`.trim();
}

function setFormValue(formElement, name, value) {
  if (formElement.elements[name]) formElement.elements[name].value = value || "";
}

function auditLabel(action) {
  const labels = {
    manual_ride_created: "Manual ride created",
    archive_metadata_edited: "Archive metadata edited",
    ride_status_changed: "Ride status changed",
    payment_status_changed: "Payment status changed",
    assigned_driver_changed: "Assigned driver changed",
    record_state_changed: "Record state changed",
  };
  return labels[action] || String(action || "Audit event").replaceAll("_", " ");
}

function renderAuditTimeline(ride) {
  if (!rideArchiveAuditTimeline) return;
  const items = Array.isArray(ride?.auditTrail) ? ride.auditTrail : [];
  if (!items.length) {
    rideArchiveAuditTimeline.innerHTML = "<p>No audit history yet.</p>";
    return;
  }

  rideArchiveAuditTimeline.innerHTML = items
    .map((item) => {
      const valueChange = item.oldValue || item.newValue
        ? `<span>${escapeHtml(item.oldValue || "Not set")} &rarr; ${escapeHtml(item.newValue || "Not set")}</span>`
        : "";
      return `
        <article class="audit-item">
          <strong>${escapeHtml(auditLabel(item.action))}</strong>
          ${valueChange}
          <small>${escapeHtml(formatTimestamp(item.timestamp))} by ${escapeHtml(item.actor || "Admin")}</small>
        </article>`;
    })
    .join("");
}

function openRideArchiveEdit(rideId) {
  const ride = currentRideArchive.find((item) => item.id === rideId);
  if (!ride || !rideArchiveEditForm || !rideArchiveEditPanel) return;
  if (!confirmDiscardUnsavedForms()) return;

  rideArchiveEditForm.reset();
  rideArchiveEditForm.dataset.dirty = "false";
  setRideArchiveEditMessage("");
  if (rideArchiveEditTitle) {
    rideArchiveEditTitle.textContent = `Edit ${ride.id} - ${ride.passengerName}`;
  }

  setFormValue(rideArchiveEditForm, "bookingId", ride.id);
  setFormValue(rideArchiveEditForm, "rideStatus", ride.rideStatus || "");
  setFormValue(rideArchiveEditForm, "rideType", ride.rideType || "");
  setFormValue(rideArchiveEditForm, "recordState", ride.recordState || "active");
  setFormValue(rideArchiveEditForm, "quotedPrice", ride.quotedPrice || "");
  setFormValue(rideArchiveEditForm, "finalPrice", ride.finalPrice || "");
  setFormValue(rideArchiveEditForm, "paymentStatus", ride.paymentStatus || "");
  setFormValue(rideArchiveEditForm, "paymentMethod", ride.paymentMethod || "");
  setFormValue(rideArchiveEditForm, "facilityName", ride.facilityName || "");
  setFormValue(rideArchiveEditForm, "facilityContactPerson", ride.facilityContactPerson || "");
  setFormValue(rideArchiveEditForm, "facilityPhone", ride.facilityPhone || "");
  setFormValue(rideArchiveEditForm, "facilityEmail", ride.facilityEmail || "");
  setFormValue(rideArchiveEditForm, "referralSource", ride.referralSource || "");
  setFormValue(rideArchiveEditForm, "assignedDriver", ride.assignedDriver || "");
  setFormValue(rideArchiveEditForm, "waitTime", ride.waitTime || "");
  setFormValue(rideArchiveEditForm, "internalNotes", ride.internalNotes || "");
  renderAuditTimeline(ride);

  rideArchiveEditPanel.hidden = false;
  rideArchiveEditPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeRideArchiveEdit() {
  if (!rideArchiveEditPanel || !rideArchiveEditForm) return;
  if (rideArchiveEditForm.dataset.dirty === "true" && !confirm("Discard unsaved ride archive changes?")) return;
  rideArchiveEditPanel.hidden = true;
  rideArchiveEditForm.reset();
  rideArchiveEditForm.dataset.dirty = "false";
  setRideArchiveEditMessage("");
}

function openManualRidePanel() {
  if (!manualRidePanel || !manualRideForm) return;
  if (!confirmDiscardUnsavedForms()) return;

  forceCloseRideArchiveEdit();
  manualRideForm.reset();
  manualRideForm.dataset.dirty = "false";
  setManualRideMessage("");
  setFormValue(manualRideForm, "rideStatus", "requested");
  setFormValue(manualRideForm, "recordState", "active");
  setFormValue(manualRideForm, "serviceType", "ambulatory");
  manualRidePanel.hidden = false;
  manualRidePanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeManualRidePanel() {
  if (!manualRidePanel || !manualRideForm) return;
  if (manualRideForm.dataset.dirty === "true" && !confirm("Discard unsaved manual ride entry?")) return;
  manualRidePanel.hidden = true;
  manualRideForm.reset();
  manualRideForm.dataset.dirty = "false";
  setManualRideMessage("");
}

function forceCloseRideArchiveEdit() {
  if (!rideArchiveEditPanel || !rideArchiveEditForm) return;
  rideArchiveEditPanel.hidden = true;
  rideArchiveEditForm.reset();
  rideArchiveEditForm.dataset.dirty = "false";
  setRideArchiveEditMessage("");
}

function forceCloseManualRidePanel() {
  if (!manualRidePanel || !manualRideForm) return;
  manualRidePanel.hidden = true;
  manualRideForm.reset();
  manualRideForm.dataset.dirty = "false";
  setManualRideMessage("");
}

function confirmDiscardUnsavedForms() {
  const editDirty = rideArchiveEditForm?.dataset.dirty === "true";
  const manualDirty = manualRideForm?.dataset.dirty === "true";
  if (!editDirty && !manualDirty) return true;

  if (!confirm("Discard unsaved admin form changes?")) return false;
  forceCloseRideArchiveEdit();
  forceCloseManualRidePanel();
  return true;
}

function rideArchiveFormPayload(formElement) {
  const data = Object.fromEntries(new FormData(formElement).entries());
  return {
    rideDetails: {
      rideStatus: data.rideStatus || "",
      rideType: data.rideType || "",
      recordState: data.recordState || "",
    },
    payment: {
      quotedPrice: data.quotedPrice || "",
      finalPrice: data.finalPrice || "",
      paymentStatus: data.paymentStatus || "",
      paymentMethod: data.paymentMethod || "",
    },
    facility: {
      facilityName: data.facilityName || "",
      facilityContactPerson: data.facilityContactPerson || "",
      facilityPhone: data.facilityPhone || "",
      facilityEmail: data.facilityEmail || "",
      referralSource: data.referralSource || "",
    },
    operations: {
      assignedDriver: data.assignedDriver || "",
      waitTime: data.waitTime || "",
      internalNotes: data.internalNotes || "",
    },
  };
}

function manualRideFormPayload(formElement) {
  const data = Object.fromEntries(new FormData(formElement).entries());
  return {
    passenger: {
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      phone: data.phone || "",
      email: data.email || "",
    },
    trip: {
      pickupAddress: data.pickupAddress || "",
      dropoffAddress: data.dropoffAddress || "",
      pickupDate: data.pickupDate || "",
      pickupTime: data.pickupTime || "",
      appointmentTime: data.appointmentTime || "",
      serviceType: data.serviceType || "other",
      returnTrip: Boolean(formElement.elements.returnTrip?.checked),
      notes: data.notes || "",
    },
    wheelchair: Boolean(formElement.elements.wheelchair?.checked),
    ...rideArchiveFormPayload(formElement),
  };
}

function hasSimilarRide(payload) {
  const passengerName = compactComparable(`${payload.passenger.firstName} ${payload.passenger.lastName}`);
  const phone = compactComparable(payload.passenger.phone);
  const email = compactComparable(payload.passenger.email);
  const pickup = payload.trip.pickupAddress;
  const dropoff = payload.trip.dropoffAddress;
  const rideTimes = [payload.trip.pickupTime, payload.trip.appointmentTime].filter(Boolean);

  return currentRideArchive.some((ride) => {
    if (!sameDay(ride.appointmentDate, payload.trip.pickupDate)) return false;
    const samePerson =
      compactComparable(ride.passengerName) === passengerName ||
      (phone && compactComparable(ride.passengerPhone) === phone) ||
      (email && compactComparable(ride.passengerEmail) === email);
    if (!samePerson) return false;

    const sameTime = rideTimes.some((time) => similarTime(time, ride.appointmentTime));
    const sameAddresses = similarAddress(pickup, ride.pickupAddress) || similarAddress(dropoff, ride.dropoffAddress);
    return sameTime || sameAddresses;
  });
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text.trim())) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportVisibleRideArchiveCsv() {
  const headers = [
    "Booking ID",
    "Customer ID",
    "Passenger Name",
    "Passenger Phone",
    "Passenger Email",
    "Pickup Address",
    "Drop-off Address",
    "Appointment Date",
    "Appointment Time",
    "Ride Type",
    "Service Type",
    "Mobility Type",
    "Trip Type",
    "Status",
    "Record State",
    "Quoted Price",
    "Final Price",
    "Payment Status",
    "Payment Method",
    "Facility Name",
    "Facility Contact Person",
    "Facility Phone",
    "Facility Email",
    "Referral Source",
    "Assigned Driver",
    "Wait Time",
    "City",
    "Notes",
    "Internal Admin Notes",
    "Created At",
    "Updated At",
  ];
  const rows = visibleRideArchive.map((ride) => [
    ride.id,
    ride.customerId,
    ride.passengerName,
    ride.passengerPhone,
    ride.passengerEmail,
    ride.pickupAddress,
    ride.dropoffAddress,
    ride.appointmentDate,
    ride.appointmentTime,
    ride.rideType,
    ride.serviceType,
    ride.mobilityType,
    ride.tripType,
    ride.statusLabel,
    ride.recordState,
    ride.quotedPrice,
    ride.finalPrice,
    ride.paymentStatus,
    ride.paymentMethod,
    ride.facilityName,
    ride.facilityContactPerson,
    ride.facilityPhone,
    ride.facilityEmail,
    ride.referralSource,
    ride.assignedDriver,
    ride.waitTime,
    ride.city,
    ride.notes,
    ride.internalAdminNotes,
    ride.createdAt,
    ride.updatedAt,
  ]);

  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tisato-ride-archive-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function analyticsQueryString() {
  const params = new URLSearchParams({
    period: analyticsPeriod?.value || "this_month",
  });

  if (analyticsPeriod?.value === "custom") {
    if (analyticsStartDate?.value) params.set("startDate", analyticsStartDate.value);
    if (analyticsEndDate?.value) params.set("endDate", analyticsEndDate.value);
  }

  return params.toString();
}

function renderMetricCard(label, value) {
  return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function renderBreakdownRows(element, rows = []) {
  if (!element) return;

  if (!rows.length) {
    element.innerHTML = `<tr><td>No data</td><td>0</td></tr>`;
    return;
  }

  element.innerHTML = rows
    .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.count)}</td></tr>`)
    .join("");
}

function renderAnalytics(analytics) {
  const metrics = analytics.metrics || {};
  const range = analytics.range || {};
  const breakdowns = analytics.breakdowns || {};

  if (analyticsRange) {
    analyticsRange.innerHTML = `
      <span>${escapeHtml(range.label || "Selected range")}</span>
      <span>${escapeHtml(range.startDate || "")} to ${escapeHtml(range.endDate || "")}</span>
    `;
  }

  if (analyticsMetrics) {
    analyticsMetrics.innerHTML = [
      renderMetricCard("Total rides", metrics.totalRides || 0),
      renderMetricCard("Completed", metrics.completedRides || 0),
      renderMetricCard("Scheduled", metrics.scheduledRides || 0),
      renderMetricCard("Canceled", metrics.canceledRides || 0),
      renderMetricCard("No-shows", metrics.noShowRides || 0),
      renderMetricCard("Unpaid rides", metrics.unpaidRides || 0),
      renderMetricCard("Unpaid balance", formatMoney(metrics.unpaidBalance)),
      renderMetricCard("Monthly revenue", formatMoney(metrics.monthlyRevenue)),
      renderMetricCard("Average ride value", formatMoney(metrics.averageRideValue)),
    ].join("");
  }

  renderBreakdownRows(analyticsByStatus, breakdowns.byStatus);
  renderBreakdownRows(analyticsByServiceType, breakdowns.byServiceType);
  renderBreakdownRows(analyticsByMobility, breakdowns.byMobility);
  renderBreakdownRows(analyticsTopFacilities, breakdowns.topFacilities);
  renderBreakdownRows(analyticsTopReferralSources, breakdowns.topReferralSources);
  renderBreakdownRows(analyticsTopCities, breakdowns.topCities);
}

function updateAnalyticsDateInputs() {
  const custom = analyticsPeriod?.value === "custom";
  if (analyticsStartDate) analyticsStartDate.disabled = !custom;
  if (analyticsEndDate) analyticsEndDate.disabled = !custom;
}

function globalSearchText(record) {
  return [
    record.id,
    record.customerId,
    record.passengerName,
    record.fullName,
    record.passengerPhone,
    record.phone,
    record.passengerEmail,
    record.email,
    record.facilityName,
    record.pickupAddress,
    record.dropoffAddress,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");
}

async function ensureGlobalSearchData() {
  if (!currentRideArchive.length) {
    try {
      const result = await requestJson("/api/admin/ride-archive?includeDeleted=true");
      currentRideArchive = result.rides || [];
      updateRideArchiveFilterOptions(currentRideArchive.filter((ride) => ride.recordState !== "deleted"));
    } catch (error) {
      console.error(error);
    }
  }

  if (!currentCustomers.length) {
    try {
      const result = await requestJson("/api/admin/customers");
      currentCustomers = result.customers || [];
    } catch (error) {
      console.error(error);
    }
  }
}

function renderGlobalSearchResults(query) {
  if (!adminGlobalSearchResults) return;
  const normalized = query.toLowerCase().trim();
  if (normalized.length < 2) {
    adminGlobalSearchResults.hidden = true;
    adminGlobalSearchResults.innerHTML = "";
    return;
  }

  const rideResults = currentRideArchive
    .filter((ride) => globalSearchText(ride).includes(normalized))
    .slice(0, 6)
    .map((ride) => ({
      type: "ride",
      id: ride.id,
      title: `${ride.id} - ${ride.passengerName}`,
      detail: `${ride.appointmentDate || "No date"} | ${ride.pickupAddress || "No pickup"}`,
    }));
  const customerResults = currentCustomers
    .filter((customer) => globalSearchText(customer).includes(normalized))
    .slice(0, 4)
    .map((customer) => ({
      type: "customer",
      id: customer.id,
      title: customer.fullName || "Unknown Customer",
      detail: `${customer.phone || "No phone"} | ${customer.email || "No email"}`,
    }));
  const results = [...rideResults, ...customerResults].slice(0, 10);

  adminGlobalSearchResults.hidden = false;
  adminGlobalSearchResults.innerHTML = results.length
    ? results
        .map(
          (result) => `
            <button type="button" data-global-result-type="${escapeHtml(result.type)}" data-global-result-id="${escapeHtml(result.id)}">
              <strong>${escapeHtml(result.title)}</strong>
              <span>${escapeHtml(result.detail)}</span>
            </button>`
        )
        .join("")
    : "<p>No matching admin records.</p>";
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
              ${booking.customerId ? `<span>Customer: ${escapeHtml(booking.customerId)}</span>` : ""}
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

function renderCustomerList(customers) {
  currentCustomers = customers;

  if (!customers.length) {
    customerList.innerHTML = "<p>No customers yet.</p>";
    customerDetail.innerHTML = "<p>Select a customer to view booking history.</p>";
    return;
  }

  customerList.innerHTML = customers
    .map(
      (customer) => `
        <button class="customer-row" type="button" data-customer-id="${escapeHtml(customer.id)}">
          <strong>${escapeHtml(customer.fullName || "Unknown Passenger")}</strong>
          <span>${escapeHtml(customer.phone || "No phone")}</span>
          <span>${escapeHtml(customer.email || "No email")}</span>
          <span>${escapeHtml(customer.totalBookings || 0)} booking(s)</span>
          <span>Last booking: ${escapeHtml(formatTimestamp(customer.lastBookingDate))}</span>
        </button>`
    )
    .join("");

  renderCustomerSummary(customers[0]);
  loadCustomerDetail(customers[0].id).catch((error) => setDashboardMessage(error.message, "error"));
}

function renderCustomerSummary(customer) {
  if (!customer) {
    customerDetail.innerHTML = "<p>Select a customer to view booking history.</p>";
    return;
  }

  customerDetail.innerHTML = `
    <article class="customer-card">
      <span class="status-pill">Customer</span>
      <h3>${escapeHtml(customer.fullName || "Unknown Passenger")}</h3>
      <div class="booking-meta">
        <span>${escapeHtml(customer.id)}</span>
        <span>${escapeHtml(customer.phone || "No phone")}</span>
        <span>${escapeHtml(customer.email || "No email")}</span>
        <span>${escapeHtml(customer.preferredContactMethod || "No contact preference")}</span>
        <span>${escapeHtml(customer.mobilityType || "No mobility type")}</span>
      </div>
      <p><strong>Total bookings:</strong> ${escapeHtml(customer.totalBookings || 0)}</p>
      <p><strong>Last booking:</strong> ${escapeHtml(formatTimestamp(customer.lastBookingDate))}</p>
      <p><strong>Notes:</strong> ${escapeHtml(customer.notes || "No notes provided.")}</p>
      <div class="booking-table compact-history">
        <p>Loading booking history...</p>
      </div>
    </article>`;
}

function renderCustomerDetail(detail) {
  const { customer, bookings } = detail;
  const history = bookings.length
    ? bookings
        .map(
          (booking) => `
            <article class="history-row">
              <div>
                <strong>${escapeHtml(booking.id)}</strong>
                <span class="status-pill">${escapeHtml(statusLabel(booking.status))}</span>
              </div>
              <p>${escapeHtml(booking.appointmentDate || "No date")} ${escapeHtml(booking.appointmentTime || "")}</p>
              <p><strong>Pickup:</strong> ${escapeHtml(booking.pickupAddress || "Not provided")}</p>
              <p><strong>Drop-off:</strong> ${escapeHtml(booking.dropoffAddress || "Not provided")}</p>
              <p>${escapeHtml(booking.tripType || "One-way")} &middot; ${escapeHtml(booking.mobilityType || "No mobility type")}</p>
            </article>`
        )
        .join("")
    : "<p>No linked bookings found for this customer.</p>";

  customerDetail.innerHTML = `
    <article class="customer-card">
      <span class="status-pill">Customer</span>
      <h3>${escapeHtml(customer.fullName || "Unknown Passenger")}</h3>
      <div class="booking-meta">
        <span>${escapeHtml(customer.id)}</span>
        <span>${escapeHtml(customer.phone || "No phone")}</span>
        <span>${escapeHtml(customer.email || "No email")}</span>
        <span>${escapeHtml(customer.preferredContactMethod || "No contact preference")}</span>
        <span>${escapeHtml(customer.mobilityType || "No mobility type")}</span>
      </div>
      <p><strong>Total bookings:</strong> ${escapeHtml(customer.totalBookings || 0)}</p>
      <p><strong>Last booking:</strong> ${escapeHtml(formatTimestamp(customer.lastBookingDate))}</p>
      <p><strong>Notes:</strong> ${escapeHtml(customer.notes || "No notes provided.")}</p>
      <div class="booking-table compact-history">${history}</div>
    </article>`;
}

async function loadCustomerDetail(customerId) {
  document
    .querySelectorAll("[data-customer-id]")
    .forEach((row) => row.classList.toggle("active", row.dataset.customerId === customerId));
  const result = await requestJson(`/api/admin/customers/${encodeURIComponent(customerId)}`);
  renderCustomerDetail(result);
}

async function loadCustomers() {
  const result = await requestJson("/api/admin/customers");
  renderCustomerList(result.customers);
}

async function loadRideArchive() {
  if (!rideArchiveTable) return;

  rideArchiveTable.innerHTML = `<tr><td colspan="12">Loading ride archive...</td></tr>`;
  const query = rideArchiveShowDeleted?.checked ? "?includeDeleted=true" : "";
  const result = await requestJson(`/api/admin/ride-archive${query}`);
  currentRideArchive = result.rides || [];
  updateRideArchiveFilterOptions(currentRideArchive);
  renderRideArchive();
}

async function loadAnalytics() {
  if (!analyticsMetrics) return;

  analyticsMetrics.innerHTML = renderMetricCard("Loading", "...");
  const result = await requestJson(`/api/admin/ride-analytics?${analyticsQueryString()}`);
  renderAnalytics(result.analytics);
  setDashboardMessage("Analytics loaded.", "success");
}

async function loadBookings() {
  setDashboardMessage("Loading bookings...");
  const result = await requestJson("/api/admin/bookings");
  renderMetrics(result.bookings);
  renderBookings(result.bookings);
  try {
    await loadCustomers();
  } catch (error) {
    customerList.innerHTML = "<p>No customers yet.</p>";
    customerDetail.innerHTML = "<p>Customer history could not be loaded.</p>";
    console.error(error);
  }
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

adminSectionLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const sectionId = link.dataset.adminSectionLink;
    if (!sectionId) return;

    event.preventDefault();
    if (!confirmDiscardUnsavedForms()) return;
    showAdminSection(sectionId);
    if (sectionId === "customers") {
      loadCustomers().catch((error) => setDashboardMessage(error.message, "error"));
    }
    if (sectionId === "rideArchive") {
      loadRideArchive().catch((error) => setDashboardMessage(error.message, "error"));
    }
    if (sectionId === "analytics") {
      loadAnalytics().catch((error) => setDashboardMessage(error.message, "error"));
    }
  });
});

[
  rideArchiveSearch,
  rideArchiveDateFilter,
  rideArchiveStatusFilter,
  rideArchivePaymentFilter,
  rideArchiveTypeFilter,
  rideArchiveFacilityFilter,
  rideArchiveCityFilter,
  rideArchiveShowDeleted,
].forEach((input) => {
  input?.addEventListener("input", renderRideArchive);
  input?.addEventListener("change", () => {
    if (input === rideArchiveShowDeleted) {
      loadRideArchive().catch((error) => setDashboardMessage(error.message, "error"));
      return;
    }
    renderRideArchive();
  });
});

exportRideArchiveButton?.addEventListener("click", () => {
  if (!visibleRideArchive.length) {
    setDashboardMessage("No visible ride archive rows to export.", "error");
    return;
  }
  exportVisibleRideArchiveCsv();
  setDashboardMessage(`Exported ${visibleRideArchive.length} visible ride archive row(s).`, "success");
});

rideArchiveTable?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-archive-edit]");
  if (!button) return;
  openRideArchiveEdit(button.dataset.archiveEdit);
});

cancelRideArchiveEditButton?.addEventListener("click", closeRideArchiveEdit);

addRideArchiveButton?.addEventListener("click", openManualRidePanel);

cancelManualRideButton?.addEventListener("click", closeManualRidePanel);

rideArchiveEditForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const bookingId = rideArchiveEditForm.elements.bookingId.value;
  const submitButton = rideArchiveEditForm.querySelector("button[type='submit']");

  if (!bookingId) {
    setRideArchiveEditMessage("No ride selected.", "error");
    return;
  }

  submitButton.disabled = true;
  setRideArchiveEditMessage(`Saving ${bookingId}...`);

  try {
    await requestJson(`/api/admin/ride-archive/${encodeURIComponent(bookingId)}`, {
      method: "PATCH",
      body: JSON.stringify(rideArchiveFormPayload(rideArchiveEditForm)),
    });
    await loadRideArchive();
    rideArchiveEditForm.dataset.dirty = "false";
    setRideArchiveEditMessage("Archive fields saved.", "success");
    setDashboardMessage(`Updated ride archive fields for ${bookingId}.`, "success");
  } catch (error) {
    setRideArchiveEditMessage(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

manualRideForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = manualRideForm.querySelector("button[type='submit']");

  submitButton.disabled = true;
  setManualRideMessage("Saving manual ride...");

  try {
    const payload = manualRideFormPayload(manualRideForm);
    if (!currentRideArchive.length) {
      await loadRideArchive();
    }
    if (hasSimilarRide(payload) && !confirm("A similar ride may already exist. Continue anyway?")) {
      setManualRideMessage("Manual ride was not saved.", "error");
      return;
    }
    const result = await requestJson("/api/admin/ride-archive", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadRideArchive();
    forceCloseManualRidePanel();
    setDashboardMessage(`Manual ride ${result.ride?.id || ""} saved.`, "success");
  } catch (error) {
    setManualRideMessage(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

analyticsPeriod?.addEventListener("change", () => {
  updateAnalyticsDateInputs();
  loadAnalytics().catch((error) => setDashboardMessage(error.message, "error"));
});

analyticsStartDate?.addEventListener("change", () => {
  if (analyticsPeriod?.value === "custom") {
    loadAnalytics().catch((error) => setDashboardMessage(error.message, "error"));
  }
});

analyticsEndDate?.addEventListener("change", () => {
  if (analyticsPeriod?.value === "custom") {
    loadAnalytics().catch((error) => setDashboardMessage(error.message, "error"));
  }
});

refreshAnalyticsButton?.addEventListener("click", () => {
  loadAnalytics().catch((error) => setDashboardMessage(error.message, "error"));
});

updateAnalyticsDateInputs();

adminGlobalSearch?.addEventListener("input", async () => {
  await ensureGlobalSearchData();
  renderGlobalSearchResults(adminGlobalSearch.value);
});

adminGlobalSearchResults?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-global-result-type]");
  if (!button) return;

  const type = button.dataset.globalResultType;
  const id = button.dataset.globalResultId;
  adminGlobalSearchResults.hidden = true;

  if (type === "ride") {
    showAdminSection("rideArchive");
    rideArchiveSearch.value = id;
    await loadRideArchive();
    renderRideArchive();
    return;
  }

  if (type === "customer") {
    showAdminSection("customers");
    await loadCustomers();
    renderCustomerSummary(currentCustomers.find((customer) => customer.id === id));
    await loadCustomerDetail(id);
  }
});

[rideArchiveEditForm, manualRideForm].forEach((formElement) => {
  formElement?.addEventListener("input", () => {
    formElement.dataset.dirty = "true";
  });
  formElement?.addEventListener("change", () => {
    formElement.dataset.dirty = "true";
  });
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

customerList.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-customer-id]");
  if (!row) return;

  renderCustomerSummary(currentCustomers.find((customer) => customer.id === row.dataset.customerId));
  try {
    await loadCustomerDetail(row.dataset.customerId);
  } catch (error) {
    setDashboardMessage(error.message, "error");
  }
});

boot();
