# Merchant API

The venue's backend, in `backend/server.js`. It is finished and you don't need to change it. It owns the menu, prices every order, and talks to Tapp Checkout with the venue's secret API key.

Base URL from the Android emulator: `http://10.0.2.2:4000`

All amounts are **integers in minor units** (pence), e.g. `1250` = £12.50.

## Get the menu

`GET /api/menu`

```json
{
  "venue": { "name": "Riverside Stadium", "location": "Block C Kiosk", "currency": "GBP" },
  "items": [
    {
      "id": "burger",
      "name": "Classic Burger",
      "category": "Food",
      "price": 850,
      "available": true,
      "modifiers": [
        { "id": "cheese", "name": "Add cheese", "price": 80 },
        { "id": "bacon", "name": "Add bacon", "price": 115 }
      ]
    }
  ]
}
```

## Place an order

`POST /api/orders`

Creates the order, prices it from the menu, and creates a Tapp payment session for it.

| Header | Required | Description |
|---|---|---|
| `Content-Type` | Yes | `application/json` |
| `Idempotency-Key` | Yes | A unique string (8–255 characters: letters, digits, `-` and `_`) for this checkout attempt. Repeating the request with the same key and the same basket returns the **same** order instead of creating a new one. Reusing a key with a different basket returns `409`. |

Request body:

```json
{
  "lines": [
    { "itemId": "burger", "modifierIds": ["cheese"], "quantity": 2 },
    { "itemId": "coffee", "modifierIds": [], "quantity": 1 }
  ]
}
```

Only item IDs, modifier IDs and quantities are read. Quantities must be whole numbers from 1 to 20.

Response: `201 Created` for a new order, or `200 OK` when the idempotency key matches an existing order.

```json
{
  "order": {
    "id": "8704b68e-2f10-4aeb-aec6-4186d0aa795a",
    "reference": "8704B6",
    "status": "pending_payment",
    "currency": "GBP",
    "lines": [
      {
        "itemId": "burger",
        "name": "Classic Burger",
        "modifiers": [{ "id": "cheese", "name": "Add cheese", "price": 80 }],
        "quantity": 2,
        "unitPrice": 930,
        "lineTotal": 1860
      }
    ],
    "total": 1860,
    "paymentUrl": "http://10.0.2.2:4100/pay/ps_Zk3n9Q1vT0aB",
    "createdAt": "2026-09-28T12:00:00.000Z",
    "paidAt": null
  }
}
```

Send the customer to `paymentUrl` to pay. It is `null` once the order is no longer waiting for payment.

## Get an order

`GET /api/orders/:id`

Returns `{ "order": { … } }` in the same shape as above, with the current `status`. If the order is still waiting for payment, the backend checks with Tapp each time you call this (at most every 2 seconds per order), so polling this endpoint is how the app finds out the result. The backend also checks every pending order in the background every 30 seconds, so a paid order reaches the kitchen even if the app is closed.

`404` if the order doesn't exist.

### Order statuses

| Status | Meaning | Final? |
|---|---|---|
| `pending_payment` | Waiting for the customer to pay, or for confirmation from Tapp | No |
| `paid` | Payment confirmed. The order has been sent to the kitchen. | Yes |
| `declined` | The card was declined | Yes |
| `cancelled` | The customer chose "Go back" on the payment page | Yes |
| `expired` | Not paid within 15 minutes | Yes |

## Returning to the app

After paying or cancelling, Tapp Checkout sends the customer's browser to:

```
http://10.0.2.2:4000/checkout/return/<orderId>?sessionId=…&status=…
```

That page immediately redirects to the app's custom URL scheme:

```
tappmobileorder://orders/<orderId>?sessionId=…&status=…
```

The `status` in these URLs is what Tapp showed the customer. It is **not** signed.

## Errors

```json
{ "error": { "code": "item_unavailable", "message": "Sorry, Hot Dog is sold out" } }
```

| Status | When |
|---|---|
| `400` | Invalid request (empty basket, unknown or sold-out item, invalid quantity, missing idempotency key). `message` is safe to show to the customer. |
| `404` | Order not found |
| `409` | Idempotency key reused with a different basket |
| `502` | Tapp Checkout couldn't be reached. Retrying with the **same** idempotency key is safe. |
