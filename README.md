# Tapp Mobile Order: Android Technical Task

Thanks for taking the time to do this task. We've tried to make it close to the work you'd do here.

## Scenario

Tapp builds payment products for hospitality venues such as hotels and stadiums. One of these products is **mobile order**: a fan at a stadium orders food and drinks from their seat on their phone and pays through **Tapp Checkout**, our hosted payment page.

A previous developer started the Android app for the Block C kiosk at Riverside Stadium. They didn't finish it, and they took a few shortcuts along the way. The venue's backend is finished. Your job is to take the app to a point where it could safely take real money.

## What's here

| Folder | What it is |
|---|---|
| `android/` | The Android app: Kotlin, Jetpack Compose, MVVM, Hilt, Room, Retrofit. **Yours to change.** |
| `backend/` | The venue's merchant API and a test version of Tapp Checkout, in Node.js. **Finished. You don't need to change it.** |
| `docs/` | [Merchant API](docs/merchant-api.md) and [Tapp Checkout API](docs/tapp-checkout-api.md) |

## Getting started

You need:
- **Android Studio** (a recent stable version) with an emulator running API 26 or later
- **Node.js 20 or later**

**1. Start the backend**

```bash
cd backend
npm install
npm run dev
```

This starts the merchant API on port 4000 and Tapp Checkout on port 4100. Open http://localhost:4100 on your computer to see a dashboard of payment sessions. With the backend running, `npm run smoke` checks it's working end to end.

**2. Run the app**

Open the `android/` folder in Android Studio and run the `app` configuration on an emulator.

The app reaches your computer at `10.0.2.2`, which is how the Android emulator sees it. To use a physical device instead, replace `10.0.2.2` with your computer's LAN IP address in `android/app/build.gradle.kts`, and start the backend with `PUBLIC_URL=http://<your-ip>:4000 TAPP_CHECKOUT_PUBLIC_URL=http://<your-ip>:4100 npm run dev`.

Run the app's unit tests with `./gradlew test` from the `android/` folder.

**Test cards:** `4111 1111 1111 1111` is approved and `4000 0000 0000 0002` is declined. Use any future expiry date and any 3 digit security code.

## Your task

The code in `android/` is yours. Change, restructure or replace anything you like. The existing code contains **bugs and some questionable decisions**. Finding and fixing them is part of the task.

### Must have

1. The customer can build a basket from the menu, including options (e.g. "Add cheese") and changing quantities. The basket survives the app being closed.
2. The customer can check out and pay through Tapp Checkout, then land back in the app.
3. The app shows the customer the real outcome of their order: paid, declined, cancelled, and anything in between.
4. The app uses the backend correctly. Read the [merchant API docs](docs/merchant-api.md).

### Should have

5. The app behaves sensibly when things go wrong: the backend being down, declined cards, a slow or missing payment confirmation, the customer tapping buttons more than once, the phone being rotated, and Android killing the app while the customer is paying.
6. Tests for the parts you think matter most.

### Nice to have

7. Accessibility: TalkBack, font scaling, touch target sizes.
8. Anything else you think a venue or customer would want. Tell us why.

## Time

Please **don't spend more than 4 hours**. Most people finish the must-haves in about 3 hours. We'd much rather see the must-haves done well than everything done badly. If you run out of time, write down what you'd do next. That counts.

## Using AI tools

You can use AI assistants, Copilot, Stack Overflow, docs, whatever you normally use. In your notes, tell us roughly where you used AI and anything you changed or rejected. In the follow-up call, you'll need to explain every part of your code as if you wrote it yourself.

## What to send us

Reply to our email with a **zip of your project**, leaving out build output (`build/`, `.gradle/`, `node_modules/`). If you've committed your work with Git, `git archive -o submission.zip HEAD` does this for you. Please don't publish your solution publicly.

Include a `NOTES.md` in the project root covering:
  - what you changed and why, including the bugs you found
  - decisions and trade-offs you made
  - what you'd do next with more time, or before going live
  - anything you're unsure about
  - where you used AI

Good luck, and have fun with it.
