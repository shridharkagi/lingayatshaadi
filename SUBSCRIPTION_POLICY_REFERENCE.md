# Subscription Policy Reference

This document is the single source of truth for subscription behavior in this project.

## Model Decision

- Subscription model: **Account-based**
- Scope: one active subscription per `user_id` (account), shared across all profiles under that account
- `profile_id` in subscription/payment flows is optional context, not entitlement scope

## Core Rules

1. **Subscription Scope**
   - Entitlements are evaluated at account level (`user_id`), not per profile.

2. **Payer vs Beneficiary Recording**
   - Always store payer account (`user_id`).
   - Optionally store profile context (`profile_id`) for support/audit clarity.
   - Recommended wording in ops: "`Uxxxx` paid for profile `LB...`".

3. **Plan Visibility**
   - Only plans with `is_active = true` are shown for new selection on membership page.
   - Disabling a plan must not impact existing active subscribers.

4. **Quota Rules**
   - `total_contact_views`: total pooled allowance during validity.
   - `daily_contact_view_limit`: pooled per-day limit.
   - Daily reset timezone: **IST**, reset at **00:00 IST**.

5. **On Plan Expiry**
   - Block contact reveal / premium actions.
   - Browsing/search/profile view remains available.
   - Show clear expiry message to user.

6. **Profile Publishing Independence**
   - Profile publish/moderation lifecycle is independent from subscription status.
   - Profiles stay visible/published per moderation state unless user/admin explicitly changes status.

7. **Manual Assignment Requirements**
   - Capture: payment mode, transaction ID, payer source (phone/account), payment date, plan chosen, start/end validity, allowed contacts (total/daily), note.
   - For free plan first-time activation, auto-fill transaction metadata with `free_auto`.

8. **Date Behavior**
   - Start and end dates should be date pickers in admin.
   - End date auto-computes from selected plan + start date.
   - Admin can manually override dates.

9. **Adjustments**
   - Admin can adjust expiry and quota for specific subscriptions.
   - Mandatory reason + audit log required.

10. **Refund/Cancellation**
   - Use status transitions (for example `refunded`) instead of destructive deletes.
   - Keep immutable audit trail.

11. **Upgrade Requests**
   - Users can raise upgrade requests with preferred callback number (default account contact, editable).
   - Requests are visible in Super Admin with status (`new`, `contacted`, `closed`).
   - Track delivery state for admin email and WhatsApp notification attempts.

12. **Audit and Notifications**
   - Audit all critical subscription actions: assignment, plan edits, adjustments, refunds, request status changes.
   - In-app notifications required for:
     - activation
     - expiry reminders
     - limit reached
     - refund/cancellation events
     - upgrade-request events (admin side)

## Standard User Messages

- Daily limit:
  - "You have reached today's contact view limit. Please try again tomorrow."
- Total limit:
  - "Your plan's total contact view limit is exhausted. Please upgrade or contact support for assistance."
- Expired plan:
  - "Your plan has expired. Renew to continue viewing contact details."

## Operational Notes

- Multi-profile accounts are expected to be a small minority; account-level pooling is intentional.
- If future business needs change, a hybrid model can be introduced without breaking audit records:
  - account subscription (default)
  - optional profile-level add-ons
