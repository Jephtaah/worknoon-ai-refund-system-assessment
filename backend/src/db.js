import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data');

async function readJson(filename) {
  const raw = await readFile(path.join(dataDir, filename), 'utf-8');
  return JSON.parse(raw);
}

async function writeJson(filename, data) {
  await writeFile(path.join(dataDir, filename), JSON.stringify(data, null, 2));
}

export function readCustomers() {
  return readJson('customers.json');
}

export function readOrders() {
  return readJson('orders.json');
}

export function readPolicy() {
  return readJson('policy.json');
}

export async function getCustomerById(customerId) {
  const customers = await readCustomers();
  return customers.find((c) => c.customer_id === customerId) ?? null;
}

export async function getOrderById(orderId) {
  const orders = await readOrders();
  return orders.find((o) => o.order_id === orderId) ?? null;
}

export async function appendAuditLog(entry) {
  const log = await readJson('audit-log.json');
  const record = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry };
  log.push(record);
  await writeJson('audit-log.json', log);
  return record;
}

export async function getAuditLog() {
  return readJson('audit-log.json');
}
