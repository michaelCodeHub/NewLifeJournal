# Dev testing, test accounts & plans

There are no built-in test logins, seeded users or dummy-data buttons. You test by creating accounts the normal way, through the sign-in screen, exactly as a real user would. Anything a normal user can't do — giving an account Plus, making someone a moderator, seeding shared content — is done from a trusted machine with a small Admin-SDK script in `functions/scripts/`.

## 1. Where to test

| | Local emulators | Real Firebase project |
|---|---|---|
| Data | Throwaway, on your machine | Real (use a separate dev project if you can) |
| Needs | Java 21, `EXPO_PUBLIC_USE_EMULATOR=1` | Real `.env` values, functions deployed |
| Sign-in | Email/password (Google works on web via the emulator's fake account picker) | Google + email/password |
| AI chat | Needs a real provider key in `functions/.secret.local` | Needs the key in Secret Manager |
| Purchases | Not possible — use the plan override (§3) | Store sandbox (§4) or the plan override |

### Emulator workflow

```bash
cd functions && npm run build && cd ..
npx firebase emulators:start --project newlifejournal-e6826 \
  --import=firebase-export-dev --export-on-exit=firebase-export-dev   # keeps your test accounts between runs
EXPO_PUBLIC_USE_EMULATOR=1 npx expo start --web -c                      # PowerShell: $env:EXPO_PUBLIC_USE_EMULATOR='1'; npx expo start --web -c
```

(`firebase-export-*` folders are git-ignored. Drop the `--import` flag the first time.)

Then, in the app:

1. **Create account**: enter an email and password. Any address works on the emulator — verification links show up in the Emulator UI (http://localhost:4000 → Authentication), not in a real inbox.
2. Choose *My pregnancy* or *My baby*. For a pregnancy, pick a due date that puts you in the stage you want to test (for example ~2 weeks away to see the "Has your baby arrived?" card, which shows from week 37).
3. Use the app: log visits, symptoms, kicks and so on. The Emulator UI shows every document as it's written.

Inspect or reset anything from the Emulator UI. To start completely fresh, stop the emulators and delete `firebase-export-dev/`.

## 2. Suggested test accounts

Create these once (emulator or a dev project), with emails you control (Gmail `+` aliases are handy: `you+free@gmail.com`).

| Account | Plan | How |
|---|---|---|
| `…+free@` | Free | Just sign up. Sees the 15-question AI limit, Plus previews and the paywall. |
| `…+plus@` | Plus (full experience) | Sign up, then `setPlan.js … plus` (§3). |
| `…+mod@` | Plus + moderator | Sign up, `setPlan.js … plus`, `setModerator.js …` (§5). Sees Profile → Moderation. |
| `…+baby@` | Free, baby mode | Sign up → *My baby*. Or: sign up → *My pregnancy* with a due date ~2 weeks away → Home "Has your baby arrived?" to test the transition. |
| A second free account | Free | For Community: post from one account, report/block from the other. |

## 3. Give an account the full Plus experience

```bash
cd functions
# real project (service-account key from Firebase → Project settings → Service accounts; keep it outside the repo)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json GCLOUD_PROJECT=newlifejournal-e6826 \
  node scripts/setPlan.js you+plus@gmail.com plus

# emulator
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=newlifejournal-e6826 \
  node scripts/setPlan.js you+plus@gmail.com plus
```

| Command | Effect |
|---|---|
| `setPlan.js <email> plus` | Plus everywhere: all Plus screens unlocked, unlimited AI (fair-use limits still apply: 6/min, 150/day) |
| `setPlan.js <email> free` | Forces Free even if they bought Plus — for testing limits and the paywall |
| `setPlan.js <email> clear` | Removes the override; the account goes back to what it actually purchased |
| `setPlan.js <email>` | Shows the current override and purchase status |

The account must have signed in once. After running it, close and reopen the app.

How it works: the script writes `users/{uid}.devTierOverride`. The app (`context/SubscriptionContext.tsx`) and the server (`functions/src/tier.ts`, used by `aiChat`) both check it before anything else. Clients can't write that field (`firestore.rules`), so a user can't give themselves Plus — only someone with the service-account key can.

Use the same command for App Store / Play reviewers and for comped accounts (influencers, staff).

## 4. Testing real purchases (store sandbox)

Use this to test the actual purchase flow, not just the Plus experience. It needs a native build (dev client, TestFlight or an internal-testing track) with the RevenueCat keys set; it doesn't work on web or Expo Go.

- **iOS:** App Store Connect → Users and Access → **Sandbox** → add a sandbox Apple ID. TestFlight and dev builds use sandbox automatically. Sign into the sandbox account when the purchase sheet asks. Subscriptions renew fast in sandbox (a monthly plan renews every few minutes) and stop after a few renewals.
- **Android:** Play Console → Settings → **License testing** → add the tester's Google account, and publish the build to an internal-testing track. Test purchases aren't charged.

After a sandbox purchase, the app calls `syncSubscription`, which asks RevenueCat and writes `subscription` to the profile. Check the result in RevenueCat → Customers (search for the Firebase uid), or run `setPlan.js <email>`.

Remember that an override wins: run `setPlan.js <email> clear` on an account before testing real purchases with it.

## 5. Moderators

```bash
cd functions
GOOGLE_APPLICATION_CREDENTIALS=… node scripts/setModerator.js you+mod@gmail.com          # grant
GOOGLE_APPLICATION_CREDENTIALS=… node scripts/setModerator.js you+mod@gmail.com --revoke # remove
```

The person signs out and back in. Profile → **Moderation** then shows open reports.

## 6. Weekly content

Nothing to do for the app — the content ships with it. For the AI to see it, seed Firestore once per project: `node scripts/seedWeekData.js` (see [SETUP_AND_DEPLOY.md](SETUP_AND_DEPLOY.md#seed-weekly-content)).

---

# How plans are maintained (no admin panel needed)

There is deliberately **no admin dashboard in the app**. Each part of "plans" is managed in the tool that owns it:

| What | Where it's managed | Notes |
|---|---|---|
| Products & prices (monthly, annual, …) | **App Store Connect** and **Google Play Console** | Prices, currencies, free trials and intro offers are set here. Apple/Google take the payment. |
| Which products the paywall shows | **RevenueCat → Offerings** (the *current* offering) | The paywall reads `offerings.current` and lists its packages, sorted Annual → … → Monthly → Lifetime. Change what's shown, or run a sale, here — no app release needed. |
| What "Plus" unlocks | RevenueCat **entitlement `premium`** + the code | Every Plus product must be attached to the `premium` entitlement. Which screens are Plus is in `types/subscription.ts` (`PREMIUM_FEATURES`); the free AI allowance (15/month) is in `functions/src/aiChat.ts` and `types/subscription.ts`. |
| Who is subscribed | **RevenueCat → Customers**, mirrored into Firestore `users/{uid}.subscription` | RevenueCat is the source of truth. The `revenueCatWebhook` function updates Firestore on renewals, cancellations, billing issues and refunds; the app also re-checks on every launch/foreground via `syncSubscription`. |
| Refunds, cancellations | Apple / Google (user or support) | RevenueCat sees them and the webhook updates Firestore automatically. |
| Free Plus for a specific person | `functions/scripts/setPlan.js <email> plus`, or RevenueCat → Customers → **Grant promotional entitlement** | `setPlan.js` is instant and lives in our database; a RevenueCat promotional grant can have an end date and shows up in RevenueCat's reports. Either works with the app. |
| Revenue, churn, trials | **RevenueCat dashboard** | Charts and exports; no need to build reports. |

The flow end to end:

```
Store (App Store / Play)  ──purchase──►  RevenueCat  ──webhook──►  revenueCatWebhook ─┐
       ▲                                     ▲                                       ├─► Firestore users/{uid}.subscription
       └── paywall (offerings.current)       └─ syncSubscription (on launch/foreground) ─┘
                                                                                      │
          App (SubscriptionContext) and aiChat read tier from here  ◄─────────────────┘
          (devTierOverride from setPlan.js wins over all of it)
```

Setup checklist for going live with Plus:

1. Create the subscription products in App Store Connect and Play Console.
2. In RevenueCat: add both apps, import the products, attach them to entitlement **`premium`**, put them in an offering and mark it **current**.
3. Put the public SDK keys in `.env` / EAS (`EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`).
4. Set the secrets `REVENUECAT_SECRET_KEY` and `REVENUECAT_WEBHOOK_SECRET`, deploy functions, and point RevenueCat → Integrations → Webhooks at the `revenueCatWebhook` URL with `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.
5. Test with sandbox accounts (§4).
