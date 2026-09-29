# Tapp Checkout API (test mode)

> The venue's backend (`backend/server.js`) already integrates with this API using the venue's **secret** API key. It is documented here so you understand the whole payment flow.
>
> **Webhooks are switched off for this venue.** The backend finds out the result with `GET /v1/payment-sessions/:id` instead, so the webhook section and the webhook behaviours of the test cards don't affect this task.

Tapp Checkout is a hosted payment page. Your server creates a **payment session**, sends the customer to Tapp to pay, and Tapp tells your server the result.

```
Customer app          Your server                    Tapp Checkout
    │                      │                               │
    │── place order ──────>│                               │
    │                      │── POST /v1/payment-sessions ─>│
    │                      │<─ { id, redirectUrl } ────────│
    │<─ redirectUrl ───────│                               │
    │── customer goes to redirectUrl ─────────────────────>│
    │                      │                               │  customer pays or cancels
    │<─ redirect to your returnUrl ────────────────────────│
    │                      │<─ webhook (signed) ───────────│
```

Base URL (mock): `http://localhost:4100` from your computer, `http://10.0.2.2:4100` from the Android emulator

## Authentication

Every API request must include your API key:

```
Authorization: Bearer sk_test_tapp_interview
```

## Amounts

All amounts are **integers in minor units**, e.g. `1250` = £12.50. Decimal amounts are rejected.

## Create a payment session

`POST /v1/payment-sessions`

| Header | Required | Description |
|---|---|---|
| `Authorization` | Yes | `Bearer <api key>` |
| `Content-Type` | Yes | `application/json` |
| `Idempotency-Key` | No (recommended) | Any unique string, up to 255 characters. Repeating a request with the same key and body returns the original session instead of creating a new one. Reusing a key with a different body returns `409`. |

Request body:

```json
{
  "amount": 1250,
  "currency": "GBP",
  "reference": "order_123",
  "returnUrl": "http://10.0.2.2:4000/checkout/return/8704b68e-2f10-4aeb-aec6-4186d0aa795a"
}
```

| Field | Type | Description |
|---|---|---|
| `amount` | integer | Amount in minor units, 1 to 1000000 |
| `currency` | string | `GBP`, `EUR` or `USD` |
| `reference` | string | Your own reference for this payment, 1-64 characters. It's returned in webhooks. |
| `returnUrl` | string | Absolute URL the customer is sent back to after paying or cancelling |

Response `201 Created`:

```json
{
  "id": "ps_Zk3n9Q1vT0aB",
  "status": "open",
  "amount": 1250,
  "currency": "GBP",
  "reference": "order_123",
  "createdAt": "2026-09-24T12:00:00.000Z",
  "updatedAt": "2026-09-24T12:00:00.000Z",
  "expiresAt": "2026-09-24T12:15:00.000Z",
  "redirectUrl": "http://10.0.2.2:4100/pay/ps_Zk3n9Q1vT0aB"
}
```

Send the customer to `redirectUrl` to pay. Sessions expire after 15 minutes.

## Retrieve a payment session

`GET /v1/payment-sessions/:id`

Returns the same shape as above, with the current `status`.

### Session statuses

| Status | Meaning | Final? |
|---|---|---|
| `open` | Waiting for the customer to pay | No |
| `authorised` | Payment approved | Yes |
| `declined` | Payment declined by the card issuer | Yes |
| `cancelled` | Customer chose "Go back" | Yes |
| `expired` | Not paid within 15 minutes | Yes |

## Return URL

After paying or cancelling, the customer's browser is redirected to your `returnUrl` with query parameters added:

```
http://10.0.2.2:4000/checkout/return/8704b68e-2f10-4aeb-aec6-4186d0aa795a?sessionId=ps_Zk3n9Q1vT0aB&status=authorised
```

## Webhooks

Tapp sends a `POST` request to your webhook URL when a payment session reaches a final status. Webhooks are switched off in this task's mock (see the note at the top).

```json
{
  "id": "evt_Qm2c8Lx0pR4d",
  "type": "payment.authorised",
  "createdAt": "2026-09-24T12:03:10.000Z",
  "data": {
    "sessionId": "ps_Zk3n9Q1vT0aB",
    "reference": "order_123",
    "amount": 1250,
    "currency": "GBP",
    "status": "authorised"
  }
}
```

Event types: `payment.authorised`, `payment.declined`, `payment.cancelled`.

### Delivery

- Respond with any `2xx` status within **5 seconds** to acknowledge an event.
- If you don't, Tapp retries up to 3 more times (after 2s, 10s and 30s).
- Webhooks are delivered **at least once**, and not necessarily in order.

### Signatures

Every webhook includes a `Tapp-Signature` header:

```
Tapp-Signature: t=1758715390,v1=5f2b0c...e91a
```

- `t` is the Unix timestamp (seconds) when the webhook was sent.
- `v1` is a hex-encoded HMAC-SHA256 of the string `<t>.<raw request body>`, using your webhook secret (`whsec_test_tapp_interview` in the mock) as the key.

To verify: compute the HMAC yourself over the **exact raw body bytes**, compare using a constant-time comparison, and reject timestamps more than 5 minutes old.

## Errors

Errors return a non-`2xx` status with this body:

```json
{ "error": { "code": "invalid_amount", "message": "amount must be a positive integer in minor units" } }
```

| Status | When |
|---|---|
| `400` | Invalid request body |
| `401` | Missing or invalid API key |
| `404` | Payment session not found |
| `409` | Idempotency key conflict |

## Test cards

Use any future expiry date and any 3 digit security code.

| Card number | Behaviour |
|---|---|
| `4111 1111 1111 1111` | Approved |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 0119` | Approved, webhook delivered twice |
| `4000 0000 0000 0259` | Approved, webhook delayed by about 20 seconds |
| `4000 0000 0000 9995` | Approved, webhook never sent |

Other card numbers are rejected. The mock never processes real cards.
