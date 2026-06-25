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

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone || "",
    email: row.email || "",
    preferredContactMethod: row.preferred_contact_method || "",
    mobilityType: row.mobility_type || "",
    notes: row.notes || "",
    totalBookings: Number(row.total_bookings || 0),
    lastBookingDate: row.last_booking_date ? toIso(row.last_booking_date) : "",
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function ensureCustomersSchema() {
  if (schemaReady) return;

  const sql = await getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      preferred_contact_method TEXT NOT NULL DEFAULT '',
      mobility_type TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      total_bookings INTEGER NOT NULL DEFAULT 0,
      last_booking_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS customers_email_idx ON customers (LOWER(email))`;
  await sql`CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone)`;
  await sql`CREATE INDEX IF NOT EXISTS customers_last_booking_date_idx ON customers (last_booking_date DESC)`;

  schemaReady = true;
}

export async function getPostgresCustomers() {
  await ensureCustomersSchema();

  const sql = await getSql();
  const rows = await sql`
    SELECT * FROM customers
    ORDER BY COALESCE(last_booking_date, created_at) DESC
  `;
  return rows.map(mapRow);
}

export async function findPostgresCustomerByEmail(email) {
  await ensureCustomersSchema();
  if (!email) return null;

  const sql = await getSql();
  const rows = await sql`SELECT * FROM customers WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function findPostgresCustomerByPhone(phone) {
  await ensureCustomersSchema();
  if (!phone) return null;

  const sql = await getSql();
  const rows = await sql`SELECT * FROM customers WHERE phone = ${phone} LIMIT 1`;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function addPostgresCustomer(customer) {
  await ensureCustomersSchema();

  const sql = await getSql();
  await sql`
    INSERT INTO customers (
      id,
      full_name,
      phone,
      email,
      preferred_contact_method,
      mobility_type,
      notes,
      total_bookings,
      last_booking_date,
      created_at,
      updated_at
    )
    VALUES (
      ${customer.id},
      ${customer.fullName},
      ${customer.phone || ""},
      ${customer.email || ""},
      ${customer.preferredContactMethod || ""},
      ${customer.mobilityType || ""},
      ${customer.notes || ""},
      ${customer.totalBookings || 0},
      ${customer.lastBookingDate || null},
      ${customer.createdAt},
      ${customer.updatedAt}
    )
  `;

  return customer;
}

export async function updatePostgresCustomer(id, updater) {
  await ensureCustomersSchema();

  const sql = await getSql();
  const rows = await sql`SELECT * FROM customers WHERE id = ${id} LIMIT 1`;
  if (!rows.length) return null;

  const updated = await updater(mapRow(rows[0]));
  await sql`
    UPDATE customers
    SET
      full_name = ${updated.fullName},
      phone = ${updated.phone || ""},
      email = ${updated.email || ""},
      preferred_contact_method = ${updated.preferredContactMethod || ""},
      mobility_type = ${updated.mobilityType || ""},
      notes = ${updated.notes || ""},
      total_bookings = ${updated.totalBookings || 0},
      last_booking_date = ${updated.lastBookingDate || null},
      created_at = ${updated.createdAt},
      updated_at = ${updated.updatedAt}
    WHERE id = ${id}
  `;

  return updated;
}
