// Merchant API for the Riverside Stadium mobile order app.
//
// This service is finished: you don't need to change it. It owns the menu, prices every
// order, creates Tapp payment sessions with the venue's secret API key, and finds out whether
// an order has been paid by asking Tapp directly. See docs/merchant-api.md.

import express from 'express';
import crypto from 'node:crypto';
import { menu, venue } from './menu.js';

const PORT = Number(process.env.PORT ?? 4000);
// Address the app uses to reach this API: 10.0.2.2 is your computer, as seen from the emulator
const PUBLIC_URL = process.env.PUBLIC_URL ?? 'http://10.0.2.2:4000';
const TAPP_BASE_URL = process.env.TAPP_BASE_URL ?? 'http://localhost:4100';
const TAPP_API_KEY = process.env.TAPP_API_KEY ?? 'sk_test_tapp_interview';
const APP_SCHEME = 'tappmobileorder';

const STATUS_CHECK_INTERVAL_MS = 2000;
const PENDING_SWEEP_EVERY_MS = 30_000;
const MAX_LINES = 30;
const MAX_QUANTITY = 20;

const ORDER_STATUS_FOR_SESSION = {
  authorised: 'paid',
  declined: 'declined',
  cancelled: 'cancelled',
  expired: 'expired',
};

const orders = new Map();
const checkoutsByKey = new Map();

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

app.get('/api/menu', (req, res) => {
  res.json({ venue, items: menu });
});

app.post('/api/orders', async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (!key || !/^[A-Za-z0-9_-]{8,255}$/.test(key)) {
    throw new HttpError(400, 'missing_idempotency_key', 'A valid Idempotency-Key header is required');
  }

  const { lines, total } = priceLines(req.body?.lines);
  const basketKey = JSON.stringify(lines.map((l) => [l.itemId, l.modifiers.map((m) => m.id), l.quantity]));

  const previous = checkoutsByKey.get(key);
  if (previous && previous.basketKey !== basketKey) {
    throw new HttpError(409, 'idempotency_conflict', 'This Idempotency-Key was already used for a different basket');
  }

  let order = previous ? orders.get(previous.orderId) : null;
  if (!order) {
    const now = new Date().toISOString();
    order = {
      id: crypto.randomUUID(),
      status: 'pending_payment',
      currency: venue.currency,
      lines,
      total,
      sessionId: null,
      paymentUrl: null,
      lastCheckedAt: 0,
      createdAt: now,
      paidAt: null,
    };
    orders.set(order.id, order);
    checkoutsByKey.set(key, { basketKey, orderId: order.id });
    console.log(`order ${order.id} created, total ${total}`);
  }

  // Also retries session creation if Tapp was unavailable on an earlier attempt
  if (order.status === 'pending_payment' && !order.sessionId) {
    const session = await callTapp('POST', '/v1/payment-sessions', {
      body: {
        amount: order.total,
        currency: order.currency,
        reference: order.id,
        returnUrl: `${PUBLIC_URL}/checkout/return/${order.id}`,
      },
      idempotencyKey: `order-${order.id}`,
    });
    order.sessionId = session.id;
    order.paymentUrl = session.redirectUrl;
  }

  res.status(previous ? 200 : 201).json({ order: publicOrder(order) });
});

app.get('/api/orders/:id', async (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) throw new HttpError(404, 'not_found', 'Order not found');

  await refreshPaymentStatus(order);
  res.set('Cache-Control', 'no-store').json({ order: publicOrder(order) });
});

// Tapp Checkout can only redirect to http(s) URLs, so it sends customers here, and this page
// hands them back to the app. The query string is passed through exactly as Tapp sent it.
app.get('/checkout/return/:id', (req, res) => {
  if (!orders.has(req.params.id)) return res.status(404).send('Order not found');

  const query = new URLSearchParams(req.query).toString();
  const appUrl = `${APP_SCHEME}://orders/${req.params.id}${query ? `?${query}` : ''}`;
  res.set('Cache-Control', 'no-store').send(`<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Returning to the app</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 48px 16px; color: #111827; }
    a { display: inline-block; margin-top: 16px; padding: 14px 20px; border-radius: 8px; background: #111827; color: #fff; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <p>Returning you to the app…</p>
  <a href="${appUrl}">Open Tapp Mobile Order</a>
  <script>window.location.replace(${JSON.stringify(appUrl)});</script>
</body>
</html>`);
});

app.use((req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Not found' } });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'invalid_json', message: 'Request body is not valid JSON' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong. Please try again.' } });
});

// ---------------------------------------------------------------------------

function priceLines(requested) {
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new HttpError(400, 'empty_basket', 'Your basket is empty');
  }
  if (requested.length > MAX_LINES) {
    throw new HttpError(400, 'basket_too_large', `A basket can have at most ${MAX_LINES} lines`);
  }

  const lines = requested.map((line) => {
    const item = menu.find((i) => i.id === line?.itemId);
    if (!item) throw new HttpError(400, 'unknown_item', "That item isn't on the menu");
    if (!item.available) throw new HttpError(400, 'item_unavailable', `Sorry, ${item.name} is sold out`);
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY) {
      throw new HttpError(400, 'invalid_quantity', `Quantity must be a whole number from 1 to ${MAX_QUANTITY}`);
    }

    const modifierIds = line.modifierIds ?? [];
    if (!Array.isArray(modifierIds) || new Set(modifierIds).size !== modifierIds.length) {
      throw new HttpError(400, 'invalid_modifiers', `Invalid options for ${item.name}`);
    }
    const modifiers = [...modifierIds].sort().map((id) => {
      const modifier = item.modifiers.find((m) => m.id === id);
      if (!modifier) throw new HttpError(400, 'invalid_modifiers', `That option isn't available for ${item.name}`);
      return modifier;
    });

    const unitPrice = item.price + modifiers.reduce((sum, m) => sum + m.price, 0);
    return { itemId: item.id, name: item.name, modifiers, quantity: line.quantity, unitPrice, lineTotal: unitPrice * line.quantity };
  });

  return { lines, total: lines.reduce((sum, l) => sum + l.lineTotal, 0) };
}

async function refreshPaymentStatus(order, { force = false } = {}) {
  if (order.status !== 'pending_payment' || !order.sessionId) return;
  if (!force && Date.now() - order.lastCheckedAt < STATUS_CHECK_INTERVAL_MS) return;
  order.lastCheckedAt = Date.now();

  let session;
  try {
    session = await callTapp('GET', `/v1/payment-sessions/${encodeURIComponent(order.sessionId)}`);
  } catch (err) {
    console.warn(`could not check payment for order ${order.id}: ${err.message}`);
    return;
  }

  if (session.reference !== order.id || session.amount !== order.total || session.currency !== order.currency) {
    console.error(`payment session ${session.id} does not match order ${order.id}, needs manual review`);
    return;
  }

  const status = ORDER_STATUS_FOR_SESSION[session.status];
  if (!status || order.status !== 'pending_payment') return;

  order.status = status;
  order.paymentUrl = null;
  if (status === 'paid') {
    order.paidAt = new Date().toISOString();
    console.log(`order ${order.id} paid, sent to kitchen`);
  } else {
    console.log(`order ${order.id} ${status}`);
  }
}

async function callTapp(method, path, { body, idempotencyKey } = {}) {
  const headers = { Authorization: `Bearer ${TAPP_API_KEY}` };
  if (body) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  let res;
  try {
    res = await fetch(`${TAPP_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    throw new HttpError(502, 'payment_provider_unavailable', "We couldn't start your payment. Please try again.");
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`Tapp ${method} ${path} failed: ${res.status} ${JSON.stringify(payload)}`);
    throw new HttpError(502, 'payment_provider_unavailable', "We couldn't start your payment. Please try again.");
  }
  return payload;
}

function publicOrder(order) {
  return {
    id: order.id,
    reference: order.id.slice(0, 6).toUpperCase(),
    status: order.status,
    currency: order.currency,
    lines: order.lines,
    total: order.total,
    paymentUrl: order.status === 'pending_payment' ? order.paymentUrl : null,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
  };
}

// Picks up payments for orders nobody is polling, e.g. the app was closed after paying
setInterval(() => {
  for (const order of orders.values()) {
    if (order.status === 'pending_payment') refreshPaymentStatus(order, { force: true });
  }
}, PENDING_SWEEP_EVERY_MS);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Merchant API running on http://localhost:${PORT} (app uses ${PUBLIC_URL})`);
});
