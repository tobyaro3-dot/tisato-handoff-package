import {
  bookingStorageUnavailableResponse,
  createBooking,
  listBookings,
  updateBookingStatus,
} from "../services/bookings.js";
import { getCustomerDetail, listCustomers } from "../services/customers.js";
import {
  createManualRideArchiveRecord,
  listRideArchive,
  updateRideArchiveMetadata,
} from "../services/ride-archive.js";
import { getRideAnalytics } from "../services/ride-analytics.js";
import { loginAdmin, logoutAdmin, requireAdmin } from "../services/admin.js";
import { readJsonBody } from "./body.js";
import { json } from "./responses.js";

export function registerRoutes(router) {
  router.register("GET", "/api/health", async (_request, response) => {
    json(response, 200, {
      success: true,
      service: "tisato-production-starter",
    });
  });

  router.register("POST", "/api/bookings", async (request, response) => {
    const body = await readJsonBody(request);
    const result = await createBooking(request, body);
    json(response, result.status, result.body);
  });

  router.register("POST", "/api/admin/login", async (request, response) => {
    const body = await readJsonBody(request);
    const result = await loginAdmin(request, response, body);
    json(response, result.status, result.body);
  });

  router.register("POST", "/api/admin/logout", async (_request, response) => {
    logoutAdmin(response);
    json(response, 200, { success: true });
  });

  router.register("GET", "/api/admin/me", async (request, response) => {
    const admin = await requireAdmin(request);
    if (!admin) {
      json(response, 401, { success: false, error: "Unauthorized" });
      return;
    }
    json(response, 200, { success: true, admin });
  });

  router.register("GET", "/api/admin/bookings", async (request, response) => {
    const admin = await requireAdmin(request);
    if (!admin) {
      json(response, 401, { success: false, error: "Unauthorized" });
      return;
    }

    const unavailable = bookingStorageUnavailableResponse();
    if (unavailable) {
      json(response, unavailable.status, unavailable.body);
      return;
    }

    json(response, 200, { success: true, bookings: await listBookings() });
  });

  router.register("GET", "/api/admin/customers", async (request, response) => {
    const admin = await requireAdmin(request);
    if (!admin) {
      json(response, 401, { success: false, error: "Unauthorized" });
      return;
    }

    const unavailable = bookingStorageUnavailableResponse();
    if (unavailable) {
      json(response, unavailable.status, unavailable.body);
      return;
    }

    json(response, 200, { success: true, customers: await listCustomers() });
  });

  router.register("GET", "/api/admin/customers/:id", async (request, response, context) => {
    const admin = await requireAdmin(request);
    if (!admin) {
      json(response, 401, { success: false, error: "Unauthorized" });
      return;
    }

    const unavailable = bookingStorageUnavailableResponse();
    if (unavailable) {
      json(response, unavailable.status, unavailable.body);
      return;
    }

    const detail = await getCustomerDetail(context.params.id, await listBookings());
    if (!detail) {
      json(response, 404, { success: false, error: "Customer not found." });
      return;
    }

    json(response, 200, { success: true, ...detail });
  });

  router.register("GET", "/api/admin/ride-archive", async (request, response) => {
    const admin = await requireAdmin(request);
    if (!admin) {
      json(response, 401, { success: false, error: "Unauthorized" });
      return;
    }

    const unavailable = bookingStorageUnavailableResponse();
    if (unavailable) {
      json(response, unavailable.status, unavailable.body);
      return;
    }

    json(response, 200, {
      success: true,
      rides: await listRideArchive({
        includeDeleted: context.url.searchParams.get("includeDeleted") === "true",
      }),
    });
  });

  router.register("GET", "/api/admin/ride-analytics", async (request, response, context) => {
    const admin = await requireAdmin(request);
    if (!admin) {
      json(response, 401, { success: false, error: "Unauthorized" });
      return;
    }

    const unavailable = bookingStorageUnavailableResponse();
    if (unavailable) {
      json(response, unavailable.status, unavailable.body);
      return;
    }

    const search = context.url.searchParams;
    json(response, 200, {
      success: true,
      analytics: await getRideAnalytics({
        period: search.get("period") || "this_month",
        startDate: search.get("startDate") || "",
        endDate: search.get("endDate") || "",
      }),
    });
  });

  router.register("POST", "/api/admin/ride-archive", async (request, response) => {
    const admin = await requireAdmin(request);
    if (!admin) {
      json(response, 401, { success: false, error: "Unauthorized" });
      return;
    }

    const unavailable = bookingStorageUnavailableResponse();
    if (unavailable) {
      json(response, unavailable.status, unavailable.body);
      return;
    }

    const body = await readJsonBody(request);
    const result = await createManualRideArchiveRecord(body, admin);
    json(response, result.status, result.body);
  });

  router.register("PATCH", "/api/admin/ride-archive/:id", async (request, response, context) => {
    const admin = await requireAdmin(request);
    if (!admin) {
      json(response, 401, { success: false, error: "Unauthorized" });
      return;
    }

    const unavailable = bookingStorageUnavailableResponse();
    if (unavailable) {
      json(response, unavailable.status, unavailable.body);
      return;
    }

    const body = await readJsonBody(request);
    const result = await updateRideArchiveMetadata(context.params.id, body, admin);
    json(response, result.status, result.body);
  });

  router.register("PATCH", "/api/admin/bookings/:id", async (request, response, context) => {
    const admin = await requireAdmin(request);
    if (!admin) {
      json(response, 401, { success: false, error: "Unauthorized" });
      return;
    }

    const body = await readJsonBody(request);
    const result = await updateBookingStatus(context.params.id, body, admin);
    json(response, result.status, result.body);
  });
}
