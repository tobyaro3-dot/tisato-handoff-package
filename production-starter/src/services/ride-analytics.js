import { listRideArchive } from "./ride-archive.js";

function dateOnly(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateRange(period = "this_month", customStart = "", customEnd = "") {
  const now = new Date();

  if (period === "custom") {
    return {
      label: "Custom",
      startDate: dateOnly(customStart) || isoDate(startOfMonth(now)),
      endDate: dateOnly(customEnd) || isoDate(now),
    };
  }

  if (period === "last_month") {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      label: "Last month",
      startDate: isoDate(startOfMonth(lastMonth)),
      endDate: isoDate(endOfMonth(lastMonth)),
    };
  }

  if (period === "last_30_days") {
    return {
      label: "Last 30 days",
      startDate: isoDate(addDays(now, -29)),
      endDate: isoDate(now),
    };
  }

  return {
    label: "This month",
    startDate: isoDate(startOfMonth(now)),
    endDate: isoDate(endOfMonth(now)),
  };
}

function rideDate(ride) {
  return dateOnly(ride.appointmentDate || ride.createdAt);
}

function inRange(ride, range) {
  const value = rideDate(ride);
  if (!value) return false;
  return value >= range.startDate && value <= range.endDate;
}

function numberFromMoney(value) {
  const number = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function ridePrice(ride) {
  return numberFromMoney(ride.finalPrice) || numberFromMoney(ride.quotedPrice);
}

function key(value) {
  const normalized = String(value || "").trim();
  return normalized || "Unknown";
}

function normalizedStatus(ride) {
  return key(ride.status || ride.statusLabel).toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

function isCompleted(ride) {
  const status = normalizedStatus(ride);
  return status === "completed" || status === "ride_completed";
}

function isScheduled(ride) {
  const status = normalizedStatus(ride);
  return status === "scheduled" || status === "ride_confirmed" || status === "driver_assigned" || status === "on_the_way";
}

function isCanceled(ride) {
  const status = normalizedStatus(ride);
  return status === "canceled" || status === "cancelled";
}

function isNoShow(ride) {
  return normalizedStatus(ride) === "no_show" || normalizedStatus(ride) === "noshow";
}

function normalizedPaymentStatus(ride) {
  return key(ride.paymentStatus).toLowerCase().replaceAll(" ", "_");
}

function countsBy(records, getValue) {
  const counts = new Map();
  for (const record of records) {
    const value = key(getValue(record));
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function mobilityGroup(ride) {
  const text = `${ride.mobilityType || ""} ${ride.serviceType || ""}`.toLowerCase();
  if (text.includes("wheelchair")) return "Wheelchair";
  if (text.includes("ambulatory")) return "Ambulatory";
  return "Unknown";
}

export async function getRideAnalytics(options = {}) {
  const range = dateRange(options.period, options.startDate, options.endDate);
  const rides = (await listRideArchive()).filter((ride) => inRange(ride, range));
  const revenueRides = rides.filter((ride) => isCompleted(ride) || normalizedPaymentStatus(ride) === "paid");
  const unpaidRides = rides.filter((ride) => {
    const paymentStatus = normalizedPaymentStatus(ride);
    return paymentStatus === "unpaid" || paymentStatus === "invoiced";
  });
  const monthlyRevenue = revenueRides.reduce((sum, ride) => sum + ridePrice(ride), 0);
  const unpaidBalance = unpaidRides.reduce((sum, ride) => sum + ridePrice(ride), 0);

  return {
    range,
    metrics: {
      totalRides: rides.length,
      completedRides: rides.filter(isCompleted).length,
      scheduledRides: rides.filter(isScheduled).length,
      canceledRides: rides.filter(isCanceled).length,
      noShowRides: rides.filter(isNoShow).length,
      unpaidRides: unpaidRides.length,
      unpaidBalance,
      monthlyRevenue,
      averageRideValue: revenueRides.length ? monthlyRevenue / revenueRides.length : 0,
    },
    breakdowns: {
      byStatus: countsBy(rides, (ride) => ride.statusLabel || ride.status),
      byServiceType: countsBy(rides, (ride) => ride.serviceType),
      byMobility: countsBy(rides, mobilityGroup),
      topFacilities: countsBy(rides, (ride) => ride.facilityName).slice(0, 5),
      topReferralSources: countsBy(rides, (ride) => ride.referralSource).slice(0, 5),
      topCities: countsBy(rides, (ride) => ride.city).slice(0, 5),
    },
  };
}
