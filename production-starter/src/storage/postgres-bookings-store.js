import { config } from "../config.js";

let sqlClient;
let schemaReady = false;

async function getSql() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!sqlClient) {
    const { neon } = await import("@neondatabase/serverless");
    sqlClient = neon(config.databaseUrl);
  }

  return sqlClient;
}

function toJson(value) {
  return JSON.stringify(value ?? null);
}

function fromJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") return JSON.parse(value);
  return value;
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row) {
  return {
    id: row.id,
    customerId: row.customer_id || "",
    status: row.status,
    passenger: fromJson(row.passenger, {}),
    trip: fromJson(row.trip, {}),
    accessibility: fromJson(row.accessibility, {}),
    consent: fromJson(row.consent, {}),
    rideDetails: fromJson(row.ride_details, {}),
    payment: fromJson(row.payment, {}),
    facility: fromJson(row.facility, {}),
    operations: fromJson(row.operations, {}),
    adminNotes: fromJson(row.admin_notes, []),
    source: fromJson(row.source, {}),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function ensureBookingsSchema() {
  if (schemaReady) return;

  const sql = await getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      passenger JSONB NOT NULL,
      trip JSONB NOT NULL,
      accessibility JSONB NOT NULL,
      consent JSONB NOT NULL,
      ride_details JSONB NOT NULL DEFAULT '{}'::jsonb,
      payment JSONB NOT NULL DEFAULT '{}'::jsonb,
      facility JSONB NOT NULL DEFAULT '{}'::jsonb,
      operations JSONB NOT NULL DEFAULT '{}'::jsonb,
      admin_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
      source JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status)`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ride_details JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS facility JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS operations JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`CREATE INDEX IF NOT EXISTS bookings_customer_id_idx ON bookings (customer_id)`;

  schemaReady = true;
}

export async function getPostgresBookings() {
  await ensureBookingsSchema();

  const sql = await getSql();
  const rows = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
  return rows.map(mapRow);
}

export async function addPostgresBooking(booking) {
  await ensureBookingsSchema();

  const sql = await getSql();
  await sql`
    INSERT INTO bookings (
      id,
      customer_id,
      status,
      passenger,
      trip,
      accessibility,
      consent,
      ride_details,
      payment,
      facility,
      operations,
      admin_notes,
      source,
      created_at,
      updated_at
    )
    VALUES (
      ${booking.id},
      ${booking.customerId || ""},
      ${booking.status},
      ${toJson(booking.passenger)}::jsonb,
      ${toJson(booking.trip)}::jsonb,
      ${toJson(booking.accessibility)}::jsonb,
      ${toJson(booking.consent)}::jsonb,
      ${toJson(booking.rideDetails || {})}::jsonb,
      ${toJson(booking.payment || {})}::jsonb,
      ${toJson(booking.facility || {})}::jsonb,
      ${toJson(booking.operations || {})}::jsonb,
      ${toJson(booking.adminNotes || [])}::jsonb,
      ${toJson(booking.source)}::jsonb,
      ${booking.createdAt},
      ${booking.updatedAt}
    )
  `;

  return booking;
}

export async function updatePostgresBooking(id, updater) {
  await ensureBookingsSchema();

  const sql = await getSql();
  const rows = await sql`SELECT * FROM bookings WHERE id = ${id} LIMIT 1`;
  if (!rows.length) return null;

  const updated = await updater(mapRow(rows[0]));
  await sql`
    UPDATE bookings
    SET
      status = ${updated.status},
      customer_id = ${updated.customerId || ""},
      passenger = ${toJson(updated.passenger)}::jsonb,
      trip = ${toJson(updated.trip)}::jsonb,
      accessibility = ${toJson(updated.accessibility)}::jsonb,
      consent = ${toJson(updated.consent)}::jsonb,
      ride_details = ${toJson(updated.rideDetails || {})}::jsonb,
      payment = ${toJson(updated.payment || {})}::jsonb,
      facility = ${toJson(updated.facility || {})}::jsonb,
      operations = ${toJson(updated.operations || {})}::jsonb,
      admin_notes = ${toJson(updated.adminNotes || [])}::jsonb,
      source = ${toJson(updated.source)}::jsonb,
      created_at = ${updated.createdAt},
      updated_at = ${updated.updatedAt}
    WHERE id = ${id}
  `;

  return updated;
}
