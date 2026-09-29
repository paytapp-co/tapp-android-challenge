// Checks the backend works end to end with the mock checkout, without a device.
// Start it with `npm run dev` first, then run `npm run smoke`.

import crypto from 'node:crypto';

const API = 'http://localhost:4000';
const RETURN = 'http://10.0.2.2:4000/checkout/return';
const BASKET = [
  { itemId: 'burger', modifierIds: ['cheese'], quantity: 1 },
  { itemId: 'coffee', quantity: 3 },
];
const EXPECTED_TOTAL = 930 + 1305;

const scenarios = [
  { name: 'approved', card: '4111111111111111', expect: 'paid' },
  { name: 'declined', card: '4000000000000002', expect: 'declined' },
  { name: 'approved (…0119)', card: '4000000000000119', expect: 'paid' },
  { name: 'approved (…0259)', card: '4000000000000259', expect: 'paid' },
  { name: 'approved (…9995)', card: '4000000000009995', expect: 'paid' },
  { name: 'customer cancels', cancel: true, expect: 'cancelled' },
];

async function placeOrder() {
  const res = await fetch(`${API}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ lines: BASKET, total: 1 }),
  });
  if (res.status !== 201) throw new Error(`create order: ${res.status} ${await res.text()}`);
  return (await res.json()).order;
}

async function pay(order, scenario) {
  // The payment URL uses the emulator address; call the mock on localhost instead
  const paymentUrl = order.paymentUrl.replace('10.0.2.2', 'localhost');
  const url = scenario.cancel ? `${paymentUrl}/cancel` : paymentUrl;
  const body = scenario.cancel ? '' : new URLSearchParams({ cardNumber: scenario.card, expiry: '12/30', cvc: '123' });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual',
  });
  const location = res.headers.get('location') ?? '';
  if (res.status !== 303 || !location.startsWith(`${RETURN}/${order.id}?`)) {
    throw new Error(`hosted page: ${res.status} -> ${location}`);
  }
}

async function waitForStatus(orderId, timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { order } = await (await fetch(`${API}/api/orders/${orderId}`)).json();
    if (order.status !== 'pending_payment') return { status: order.status, ms: Date.now() - started };
    await new Promise((r) => setTimeout(r, 500));
  }
  return { status: 'pending_payment', ms: timeoutMs };
}

let failures = 0;

for (const scenario of scenarios) {
  try {
    const order = await placeOrder();
    if (order.total !== EXPECTED_TOTAL) throw new Error(`total ${order.total}, expected ${EXPECTED_TOTAL}`);
    await pay(order, scenario);
    const { status, ms } = await waitForStatus(order.id);
    const ok = status === scenario.expect;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${scenario.name.padEnd(18)} -> ${status} in ${ms}ms (order ${order.id})`);
  } catch (err) {
    failures++;
    console.log(`FAIL  ${scenario.name.padEnd(18)} -> ${err.message}`);
  }
}

const key = crypto.randomUUID();
const post = () => fetch(`${API}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
  body: JSON.stringify({ lines: BASKET }),
});
const [first, second] = await Promise.all([post(), post()]);
const a = (await first.json()).order;
const b = (await second.json()).order;
const sameOrder = a.id === b.id && a.paymentUrl === b.paymentUrl;
if (!sameOrder) failures++;
console.log(`${sameOrder ? 'PASS' : 'FAIL'}  double tap         -> ${sameOrder ? 'same order and payment' : 'two different orders'}`);

const soldOut = await fetch(`${API}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
  body: JSON.stringify({ lines: [{ itemId: 'hotdog', quantity: 1 }] }),
});
if (soldOut.status !== 400) failures++;
console.log(`${soldOut.status === 400 ? 'PASS' : 'FAIL'}  sold out item      -> ${soldOut.status}`);

process.exit(failures ? 1 : 0);
