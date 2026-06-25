import { join } from "node:path";
import { config } from "../config.js";
import { mutateJsonFile, readJsonFile } from "./json-store.js";
import {
  addPostgresCustomer,
  findPostgresCustomerByEmail,
  findPostgresCustomerByPhone,
  getPostgresCustomers,
  updatePostgresCustomer,
} from "./postgres-customers-store.js";

const customersPath = join(config.dataDir, "customers.json");

function sortCustomers(customers) {
  return customers.sort((left, right) => {
    const leftDate = left.lastBookingDate || left.updatedAt || left.createdAt || "";
    const rightDate = right.lastBookingDate || right.updatedAt || right.createdAt || "";
    return rightDate.localeCompare(leftDate);
  });
}

export async function getCustomers() {
  if (config.databaseUrl) return getPostgresCustomers();

  return sortCustomers(await readJsonFile(customersPath, []));
}

export async function findCustomerByEmail(email) {
  if (!email) return null;
  if (config.databaseUrl) return findPostgresCustomerByEmail(email);

  const normalizedEmail = email.toLowerCase();
  const customers = await readJsonFile(customersPath, []);
  return customers.find((customer) => customer.email?.toLowerCase() === normalizedEmail) || null;
}

export async function findCustomerByPhone(phone) {
  if (!phone) return null;
  if (config.databaseUrl) return findPostgresCustomerByPhone(phone);

  const customers = await readJsonFile(customersPath, []);
  return customers.find((customer) => customer.phone === phone) || null;
}

export async function addCustomer(customer) {
  if (config.databaseUrl) return addPostgresCustomer(customer);

  return mutateJsonFile(customersPath, [], async (customers) => {
    const nextValue = sortCustomers([customer, ...customers]);
    return {
      nextValue,
      result: customer,
    };
  });
}

export async function updateCustomer(id, updater) {
  if (config.databaseUrl) return updatePostgresCustomer(id, updater);

  return mutateJsonFile(customersPath, [], async (customers) => {
    const index = customers.findIndex((customer) => customer.id === id);
    if (index === -1) {
      return {
        nextValue: customers,
        result: null,
      };
    }

    const updated = await updater(customers[index]);
    const nextValue = customers.slice();
    nextValue[index] = updated;

    return {
      nextValue: sortCustomers(nextValue),
      result: updated,
    };
  });
}
