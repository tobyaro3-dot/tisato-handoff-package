import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const dataDir = mkdtempSync(join(tmpdir(), "tisato-admin-smoke-"));
process.env.DATA_DIR = dataDir;

const { createManualRideArchiveRecord, listRideArchive, updateRideArchiveMetadata } = await import(
  "../src/services/ride-archive.js"
);
const { getRideAnalytics } = await import("../src/services/ride-analytics.js");
const { getCustomers } = await import("../src/storage/customers-store.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJsonIfExists(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

try {
  const admin = { email: "admin@example.com" };
  const created = await createManualRideArchiveRecord(
    {
      passenger: {
        firstName: "Smoke",
        lastName: "Tester",
        phone: "4075551212",
        email: "smoke@example.com",
      },
      trip: {
        pickupDate: "2026-07-15",
        pickupTime: "08:00",
        appointmentTime: "09:00",
        pickupAddress: "100 Orange Ave, Orlando, FL",
        dropoffAddress: "200 Clinic Way, Orlando, FL",
        serviceType: "ambulatory",
        notes: "Smoke test",
      },
      rideDetails: {
        rideStatus: "requested",
        rideType: "Phone booking",
        recordState: "active",
      },
      payment: {
        quotedPrice: "100.00",
        paymentStatus: "unpaid",
      },
      facility: {
        facilityName: "Smoke Clinic",
        referralSource: "Phone",
      },
      operations: {
        assignedDriver: "TISATO",
      },
    },
    admin,
  );

  assert(created.status === 201, "Manual ride should be created.");
  const rideId = created.body.ride.id;
  const customers = await getCustomers();
  assert(customers.length === 1, "Manual ride should create or link one customer.");
  assert(created.body.ride.customerId, "Manual ride should have a customerId.");

  const invalid = await updateRideArchiveMetadata(rideId, { rideDetails: { rideStatus: "bad_status" } }, admin);
  assert(invalid.status === 422, "Invalid archive status should be rejected.");
  const invalidPrice = await updateRideArchiveMetadata(rideId, { payment: { quotedPrice: "one hundred" } }, admin);
  assert(invalidPrice.status === 422, "Invalid archive price should be rejected.");

  const updated = await updateRideArchiveMetadata(
    rideId,
    {
      rideDetails: {
        rideStatus: "completed",
        rideType: "Phone booking",
        recordState: "active",
      },
      payment: {
        quotedPrice: "100.00",
        finalPrice: "125.00",
        paymentStatus: "paid",
        paymentMethod: "card",
      },
      facility: {
        facilityName: "Smoke Clinic",
        referralSource: "Phone",
      },
      operations: {
        assignedDriver: "TISATO",
        internalNotes: "Completed during smoke test",
      },
    },
    admin,
  );
  assert(updated.status === 200, "Archive metadata should update.");

  const rides = await listRideArchive();
  assert(rides.length === 1, "Archive should include the manual ride.");
  assert(rides[0].status === "completed", "Archive status should reflect updated metadata.");
  assert(rides[0].auditTrail.length >= 2, "Archive should include audit timeline entries.");

  await updateRideArchiveMetadata(rideId, { rideDetails: { recordState: "deleted" } }, admin);
  const activeOnly = await listRideArchive();
  assert(activeOnly.length === 0, "Deleted rides should be hidden by default.");
  const includingDeleted = await listRideArchive({ includeDeleted: true });
  assert(includingDeleted.length === 1, "Deleted rides should be visible when requested.");
  await updateRideArchiveMetadata(rideId, { rideDetails: { recordState: "active" } }, admin);

  const analytics = await getRideAnalytics({
    period: "custom",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  });
  assert(analytics.metrics.totalRides === 1, "Analytics should count the ride.");
  assert(analytics.metrics.monthlyRevenue === 125, "Analytics should use finalPrice for revenue.");

  const emailLog = readJsonIfExists(join(dataDir, "email-log.json"), []);
  assert(emailLog.length === 0, "Manual/archive smoke flow should not create email log entries.");

  console.log("Admin system smoke checks passed.");
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
