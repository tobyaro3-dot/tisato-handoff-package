import {
  addCustomer,
  findCustomerByEmail,
  findCustomerByPhone,
  getCustomers,
  updateCustomer,
} from "../storage/customers-store.js";
import { createId } from "../utils/ids.js";

function fullNameFromBooking(booking) {
  return `${booking.passenger?.firstName || ""} ${booking.passenger?.lastName || ""}`.trim();
}

function preferredContactMethod(booking) {
  if (booking.consent?.smsUpdatesOptIn || booking.consent?.smsUpdates) return "SMS and phone/email";
  if (booking.passenger?.email && booking.passenger?.phone) return "Phone or email";
  if (booking.passenger?.phone) return "Phone";
  if (booking.passenger?.email) return "Email";
  return "";
}

function mobilityType(booking) {
  const values = [booking.trip?.serviceType].filter(Boolean);
  if (booking.accessibility?.wheelchair) values.push("Wheelchair");
  return values.join(" / ");
}

function bookingAppointmentDate(booking) {
  return booking.trip?.pickupDate || booking.createdAt || "";
}

function customerPatchFromBooking(booking, now) {
  return {
    fullName: fullNameFromBooking(booking) || "Unknown Passenger",
    phone: booking.passenger?.phone || "",
    email: booking.passenger?.email || "",
    preferredContactMethod: preferredContactMethod(booking),
    mobilityType: mobilityType(booking),
    notes: booking.trip?.notes || "",
    lastBookingDate: bookingAppointmentDate(booking),
    updatedAt: now,
  };
}

async function findMatchingCustomer(booking) {
  const email = booking.passenger?.email || "";
  if (email) {
    const byEmail = await findCustomerByEmail(email);
    if (byEmail) return byEmail;
  }

  const phone = booking.passenger?.phone || "";
  if (phone) return findCustomerByPhone(phone);

  return null;
}

export async function linkBookingToCustomer(booking) {
  const now = new Date().toISOString();
  const existing = await findMatchingCustomer(booking);
  const patch = customerPatchFromBooking(booking, now);

  if (existing) {
    const updated = await updateCustomer(existing.id, (customer) => ({
      ...customer,
      fullName: patch.fullName || customer.fullName,
      phone: patch.phone || customer.phone,
      email: patch.email || customer.email,
      preferredContactMethod: patch.preferredContactMethod || customer.preferredContactMethod,
      mobilityType: patch.mobilityType || customer.mobilityType,
      notes: patch.notes || customer.notes,
      totalBookings: Number(customer.totalBookings || 0) + 1,
      lastBookingDate: patch.lastBookingDate || customer.lastBookingDate,
      updatedAt: now,
    }));

    return updated || existing;
  }

  return addCustomer({
    id: createId("cus"),
    ...patch,
    totalBookings: 1,
    createdAt: now,
    updatedAt: now,
  });
}

function bookingSummary(booking) {
  return {
    id: booking.id,
    customerId: booking.customerId || "",
    appointmentDate: booking.trip?.pickupDate || "",
    appointmentTime: booking.trip?.appointmentTime || booking.trip?.pickupTime || "",
    pickupAddress: booking.trip?.pickupAddress || "",
    dropoffAddress: booking.trip?.dropoffAddress || "",
    tripType: booking.trip?.returnTrip ? "Round trip requested" : "One-way",
    mobilityType: mobilityType(booking),
    status: booking.status,
    createdAt: booking.createdAt,
  };
}

export async function listCustomers() {
  return getCustomers();
}

export async function getCustomerDetail(id, bookings) {
  const customers = await getCustomers();
  const customer = customers.find((item) => item.id === id);
  if (!customer) return null;

  const customerBookings = bookings
    .filter((booking) => booking.customerId === id)
    .map(bookingSummary);

  return {
    customer,
    bookings: customerBookings,
  };
}
