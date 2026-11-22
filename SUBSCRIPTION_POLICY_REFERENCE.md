# Subscription Policy Reference

Single source of truth for how plans, payments and contact access work.
Updated 23 Nov 2026 (account-level plans, migration `supabase/migrations/20261123_08_account_plans.sql`).

All plan logic lives in **`src/lib/server/plans.ts`** — admin screens, profile approval, contact
reveal and any future payment gateway must go through it. Do not write to `user_subscriptions`,
`payment_transactions` or `subscription_events` anywhere else.

## 1. Model

- **Plans belong to the login account** (U-code, `auth.users.id`), not to a profile. One plan is
  shared by all profiles on the account (up to 3).
- **One current plan per account.** The database allows at most one `active` row per account.
- **Plan templates vs member plans**
  - *Templates* (`subscription_plans`: Free, Gold, …) hold the default price, validity (days),
    total contacts and contacts per day.
  - When a plan is given to an account, those values are **copied onto the member's own plan**
    (`user_subscriptions`). From then on they can be changed for that member only.
  - Editing a template **never** changes plans members already have.
- **Contact limits:** empty / `null` = unlimited, `0` = none.

## 2. Plan templates (admin → Plans & subscriptions → Plan templates)

- Editable: name, price, validity (days), total contacts, contacts per day, display order,
  **Visible to members** (shown on the Membership page).
- Hidden plans can still be assigned by admin. **Archived** plans cannot be assigned.
- The plan **code** never changes. The **Free** plan (`code = free`) cannot be archived.
- New plans can be created. Every template change needs a reason and is logged.

## 3. Free plan

- Given **automatically once per account**, when the account's **first profile is approved**.
- Not given at signup, not on re-approval after edits, not for a second profile, and skipped if
  the account already has an active plan.
- Starts on the approval date, runs for the Free template's validity (30 days today).
- **No automatic renewal.** Admin can renew it for one account or in bulk ("Renew Free").
- If the profile is later rejected or deleted, the Free plan stays until it ends (admin may cancel).
- One-time catch-up on 23 Nov 2026: accounts with an approved profile received Free for 30 days
  (Prod: 49 accounts, all ending around 23 Dec 2026).

## 4. Assigning a plan

- From the account page (**Assign / change plan**) or Plans & subscriptions (row **Assign**,
  **Assign plan** search, or bulk **Assign plan**).
- Any current plan **ends immediately** (kept in history as "replaced"); the new plan starts.
  Unused contacts do not carry over.
- Start date: today or earlier (backdating for offline payments). Not in the future — to add time
  after the current plan, use **Extend**.
- End date defaults to start + template validity; can be changed.
- Total contacts, contacts per day and the member's price default from the template; can be changed.
- Optionally record a payment at the same time (single account only).
- Assigning a **paid** plan closes the account's open upgrade requests.
- The member gets an in-app notification ("Plan activated").

## 5. Changing an existing plan (single or bulk)

| Action | What it does |
|---|---|
| **Edit** | Start/end dates, total contacts, contacts per day, member price, note |
| **Extend** | Adds N days from the end date (or from today if it already ended). Extending an expired plan makes it active again, if the account has no other active plan |
| **Set end date** | Sets a new end date |
| **Set contacts / Add contacts** | Sets totals, or adds/removes N contacts (unlimited stays unlimited) |
| **Cancel** | Ends the plan now; contact details lock. Plan and payments stay in history |

- Cancelled and refunded plans cannot be edited — assign a new plan instead.
- Bulk actions apply to each selected account's current plan (or its most recent one if it ended),
  run one by one, and report which accounts succeeded and which were skipped and why.

## 6. Payments and refunds (offline today)

- Payments are separate records linked to an account and, optionally, a plan. A plan can have
  several payments (e.g. part payments) or none (Free).
- **Record payment:** amount, mode (UPI, PhonePe, Google Pay, bank, cash, cheque, other),
  transaction/reference ID (required except cash), payer phone/account, payment date, note.
  A transaction ID already recorded is rejected to prevent double entry.
- **Edit payment:** fix amount, mode, reference, payer, date, note.
- **Refund:** full or partial amount, refund date, mode, reason. Option to end the linked plan now
  (status `refunded`). A partially refunded payment shows "part refunded".
- **Remove:** only for a payment entered by mistake; kept as `void` and excluded from totals.
  Not allowed once refunds are recorded.
- "Price" on a plan = what was agreed with the member; "Paid" = sum of its payments minus refunds.

## 7. Contact access and quota

- A member can view contact details only while the account has a plan that is `active`, has
  started and has not ended.
- Quota is pooled for the whole account (all its profiles, including deleted ones) and counted
  **within the current plan period** — a new plan starts fresh.
- Daily limit resets at **00:00 IST**.
- Re-opening a contact already revealed by any profile on the account is free and not re-counted.
- Only numbers the profile owner marked "Show on public profile" are released.
- Browsing, search and profile pages stay available without a plan.

## 8. Statuses

| Status | Meaning |
|---|---|
| Active | Started, not ended |
| Expiring soon | Active, ends within 7 days |
| Expired | End date passed (worked out from the date; can be extended) |
| Cancelled | Ended early by admin |
| Refunded | Ended because money was returned |

## 9. History and audit

- Every change writes a row in `subscription_events`: when, account, action, before → after,
  **reason (required)**, admin who did it, and a **batch id** for bulk actions.
- Visible in Plans & subscriptions → **Change log** (filter by type, date, batch) and on each
  account page (**Plan history**). Nothing is hard-deleted.
- A summary entry per action is also written to the admin audit log.

## 10. Upgrade requests

- Members raise requests from the Membership page with a callback number (default: account phone).
- Handled in **Upgrade pipeline** (new → contacted → closed). "Assign plan" on a card opens the
  account with the requested plan pre-selected; a paid assignment closes the request.
- Email / WhatsApp alerts to admin need `RESEND_API_KEY` and `WHATSAPP_NOTIFY_WEBHOOK_URL`
  (not configured yet; requests still appear in the pipeline).
- The pre-filled WhatsApp messages for upgrade buttons are editable in Site settings.

## 11. Reporting

- **Overview → Plans & revenue** and the Plans page summary use the same calculation
  (`src/lib/server/planStats.ts`).
- Revenue is **net**: money received in the period minus refunds given in the period; removed
  (`void`) payments never count.
- Tiles: paid plans active (and Free count), new paid plans, paid renewals due (30 / 7 days),
  Free plans ending (30 days), paid plans lapsed (ran out in the last 30 days, not renewed),
  accounts with a live profile but no plan, refunds given.

## 12. Member messages

- No plan / ended: "You need an active plan to view contact details. Please upgrade or contact support."
- Daily limit: "You have reached today's contact view limit. Please try again tomorrow."
- Total limit: "Your plan's total contact view limit is exhausted. Please upgrade or contact support for assistance."

## 13. Not built yet

- Automatic expiry reminders to members (table `subscription_notification_logs` exists, no job yet).
- Online payment gateway. The design is ready: payments have a provider (`manual` today,
  e.g. `razorpay` later), statuses `initiated → paid / failed → refunded`, and a unique
  (provider, transaction id) so a gateway confirmation can't be counted twice. A gateway
  confirmation should call the same `assignPlan` / `recordPayment` functions.
- Undo for a bulk batch (the before-values are stored, so it can be added).
