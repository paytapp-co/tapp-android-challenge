// Mock Tapp Checkout (test mode).
//
// Behaves like a simplified version of Tapp's hosted payment page:
//   1. Merchant backend creates a payment session  -> POST /v1/payment-sessions
//   2. Customer is redirected to the hosted page     -> GET  /pay/:id
//   3. Customer pays / cancels, is redirected back   -> returnUrl?sessionId=...&status=...
//   4. Tapp sends a signed webhook to the merchant   -> POST TAPP_WEBHOOK_URL
//
// You do not need to change anything in this folder. See docs/tapp-checkout-api.md.

import express from 'express';
import crypto from 'node:crypto';
import { renderCheckoutPage, renderClosedPage, renderDashboard } from './views.js';

const PORT = Number(process.env.TAPP_CHECKOUT_PORT ?? 4100);
// Address the customer's device uses to reach this service. 10.0.2.2 is the host machine
// from the Android emulator; use your computer's LAN IP for a physical device.
const BASE_URL = process.env.TAPP_CHECKOUT_PUBLIC_URL ?? `http://10.0.2.2:${PORT}`;
const API_KEY = process.env.TAPP_API_KEY ?? 'sk_test_tapp_interview';
const WEBHOOK_SECRET = process.env.TAPP_WEBHOOK_SECRET ?? 'whsec_test_tapp_interview';
// Webhooks are switched off for this venue: its backend checks payment status with
// GET /v1/payment-sessions/:id instead. Set TAPP_WEBHOOK_URL to turn them on.
const WEBHOOK_URL = process.env.TAPP_WEBHOOK_URL || null;

const SESSION_TTL_MS = 15 * 60 * 1000;
const WEBHOOK_TIMEOUT_MS = 5000;
const RETRY_DELAYS_MS = [2000, 10000, 30000];
const SUPPORTED_CURRENCIES = ['GBP', 'EUR', 'USD'];

export const TEST_CARDS = {
  '4111111111111111': { outcome: 'authorised', webhook: 'normal', label: 'Approved' },
  '4000000000000002': { outcome: 'declined', webhook: 'normal', label: 'Declined' },
  '4000000000000119': { outcome: 'authorised', webhook: 'duplicate', label: 'Approved, webhook delivered twice' },
  '4000000000000259': { outcome: 'authorised', webhook: 'delayed', label: 'Approved, webhook delayed ~20s' },
  '4000000000009995': { outcome: 'authorised', webhook: 'none', label: 'Approved, webhook never sent' },
};

const sessions = new Map();
const idempotencyKeys = new Map();
const deliveries = [];

const app = express();
app.disable('x-powered-by');

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const api = express.Router();
api.use(express.json());

api.use((req, res, next) => {
  if (req.get('authorization') !== `Bearer ${API_KEY}`) {
    return apiError(res, 401, 'unauthorised', 'Missing or invalid API key');
  }
  next();
});

api.post('/payment-sessions', (req, res) => {
  const { amount, currency, reference, returnUrl } = req.body ?? {};

  if (!Number.isInteger(amount) || amount <= 0 || amount > 1_000_000) {
    return apiError(res, 400, 'invalid_amount', 'amount must be a positive integer in minor units (e.g. 1250 = £12.50), max 1000000');
  }
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return apiError(res, 400, 'invalid_currency', `currency must be one of ${SUPPORTED_CURRENCIES.join(', ')}`);
  }
  if (typeof reference !== 'string' || reference.length < 1 || reference.length > 64) {
    return apiError(res, 400, 'invalid_reference', 'reference must be a string of 1-64 characters');
  }
  if (!isHttpUrl(returnUrl)) {
    return apiError(res, 400, 'invalid_return_url', 'returnUrl must be an absolute http(s) URL');
  }

  const idempotencyKey = req.get('idempotency-key');
  const fingerprint = JSON.stringify({ amount, currency, reference, returnUrl });
  if (idempotencyKey) {
    const existing = idempotencyKeys.get(idempotencyKey);
    if (existing && existing.fingerprint !== fingerprint) {
      return apiError(res, 409, 'idempotency_conflict', 'Idempotency-Key was already used with a different request body');
    }
    if (existing) {
      return res.status(200).json(publicSession(sessions.get(existing.sessionId)));
    }
  }

  const now = Date.now();
  const session = {
    id: `ps_${randomId()}`,
    status: 'open',
    amount,
    currency,
    reference,
    returnUrl,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  };
  sessions.set(session.id, session);
  if (idempotencyKey) idempotencyKeys.set(idempotencyKey, { fingerprint, sessionId: session.id });

  res.status(201).json(publicSession(session));
});

api.get('/payment-sessions/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return apiError(res, 404, 'not_found', 'Payment session not found');
  res.json(publicSession(session));
});

app.use('/v1', api);

// ---------------------------------------------------------------------------
// Hosted payment page
// ---------------------------------------------------------------------------

app.get('/pay/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).send(renderClosedPage('Payment not found'));
  if (session.status !== 'open') return res.status(410).send(renderClosedPage('This payment is no longer open'));
  res.send(renderCheckoutPage({ session, testCards: TEST_CARDS }));
});

app.post('/pay/:id', express.urlencoded({ extended: false }), (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).send(renderClosedPage('Payment not found'));
  if (session.status !== 'open') return res.status(410).send(renderClosedPage('This payment is no longer open'));

  const cardNumber = String(req.body.cardNumber ?? '').replace(/\s+/g, '');
  const expiry = String(req.body.expiry ?? '').trim();
  const cvc = String(req.body.cvc ?? '').trim();
  const values = { cardNumber: req.body.cardNumber ?? '', expiry, cvc: '' };

  const card = TEST_CARDS[cardNumber];
  const errors = {};
  if (!card) errors.cardNumber = 'Test mode: use one of the test cards listed below';
  if (!isFutureExpiry(expiry)) errors.expiry = 'Enter a future expiry date in MM/YY format';
  if (!/^\d{3,4}$/.test(cvc)) errors.cvc = 'Enter the 3 or 4 digit security code';
  if (Object.keys(errors).length) {
    return res.status(422).send(renderCheckoutPage({ session, testCards: TEST_CARDS, errors, values }));
  }

  updateStatus(session, card.outcome);
  scheduleWebhook(session, card.webhook);
  redirectToMerchant(res, session);
});

app.post('/pay/:id/cancel', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).send(renderClosedPage('Payment not found'));
  if (session.status !== 'open') return res.status(410).send(renderClosedPage('This payment is no longer open'));

  updateStatus(session, 'cancelled');
  scheduleWebhook(session, 'normal');
  redirectToMerchant(res, session);
});

// Debug dashboard: sessions and webhook delivery log
app.get('/', (req, res) => {
  res.send(renderDashboard({
    sessions: [...sessions.values()].map((s) => getSession(s.id)).reverse(),
    deliveries: [...deliveries].reverse(),
    testCards: TEST_CARDS,
    webhookUrl: WEBHOOK_URL,
  }));
});

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

function scheduleWebhook(session, mode) {
  if (!WEBHOOK_URL || mode === 'none') return;

  const event = {
    id: `evt_${randomId()}`,
    type: `payment.${session.status}`,
    createdAt: new Date().toISOString(),
    data: {
      sessionId: session.id,
      reference: session.reference,
      amount: session.amount,
      currency: session.currency,
      status: session.status,
    },
  };

  if (mode === 'duplicate') {
    setTimeout(() => deliver(event), 300);
    setTimeout(() => deliver(event), 320);
  } else if (mode === 'delayed') {
    setTimeout(() => deliver(event), 20_000);
  } else {
    setTimeout(() => deliver(event), 500);
  }
}

async function deliver(event, attempt = 1) {
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex');

  const log = { eventId: event.id, type: event.type, sessionId: event.data.sessionId, attempt, at: new Date().toISOString() };
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'tapp-signature': `t=${timestamp},v1=${signature}` },
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    log.status = res.status;
  } catch (err) {
    log.error = err.name === 'TimeoutError' ? `timed out after ${WEBHOOK_TIMEOUT_MS}ms` : err.message;
  }
  deliveries.push(log);

  const ok = log.status >= 200 && log.status < 300;
  console.log(`[webhook] ${event.type} ${event.id} attempt ${attempt} -> ${log.status ?? log.error}`);
  if (!ok && attempt <= RETRY_DELAYS_MS.length) {
    setTimeout(() => deliver(event, attempt + 1), RETRY_DELAYS_MS[attempt - 1]);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSession(id) {
  const session = sessions.get(id);
  if (session && session.status === 'open' && Date.parse(session.expiresAt) < Date.now()) {
    updateStatus(session, 'expired');
  }
  return session;
}

function updateStatus(session, status) {
  session.status = status;
  session.updatedAt = new Date().toISOString();
}

function publicSession(session) {
  const { returnUrl, ...rest } = session;
  return { ...rest, redirectUrl: `${BASE_URL}/pay/${session.id}` };
}

function redirectToMerchant(res, session) {
  const url = new URL(session.returnUrl);
  url.searchParams.set('sessionId', session.id);
  url.searchParams.set('status', session.status);
  res.redirect(303, url.toString());
}

function apiError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isFutureExpiry(value) {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const endOfMonth = new Date(year, month, 1);
  return endOfMonth > new Date();
}

function randomId() {
  return crypto.randomBytes(9).toString('base64url');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock Tapp Checkout running on ${BASE_URL} (dashboard: ${BASE_URL}/)`);
  console.log(WEBHOOK_URL ? `Webhooks will be sent to ${WEBHOOK_URL}` : 'Webhooks are switched off');
});
