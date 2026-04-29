# LingayatBandhu

A responsive matrimonial web application for the Lingayat community. Built with Next.js, React, and Tailwind CSS.

## Features

- **Onboarding** - Welcome flow with intro slides
- **Auth** - Login, Sign up with OTP verification
- **Profile Creation** - Multi-step form with About Me (show/hide), Profile Details, Horoscope, Education & Career, Family Details, Profile Photo
- **Home** - Dashboard with quick actions and suggested matches
- **Search** - List/Grid view with filters
- **Profiles** - View own profile, edit, match preferences, view other profiles
- **Messages** - Chat interface
- **Activities** - Interests, Profile views, Shortlist, Blocked, Notes
- **Notifications** - Notification list
- **Membership** - Plans and Trust Badge
- **Settings** - Account, Notifications, Billing, Help & Support

## Tech Stack

- Next.js 16 (App Router)
- React 18.3.1
- TypeScript
- Tailwind CSS
- Lucide React (icons)
- Supabase (Backend)

## Getting Started

### ⚠️ Important: Local Development

Due to a Turbopack bug in Next.js 16, click events don't work in development mode. Use production mode instead:

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run in production mode (RECOMMENDED)
npm run dev:prod
```

Open [http://localhost:3002](http://localhost:3002)

**All clicks will work perfectly!** ✅

For detailed development setup, see [LOCAL_DEVELOPMENT_GUIDE.md](LOCAL_DEVELOPMENT_GUIDE.md)

### Alternative: Traditional Dev Mode (Not Recommended)

```bash
npm run dev  # Opens on http://localhost:3000
```

⚠️ **Note:** Clicks won't work in dev mode due to a Turbopack bug. Use production mode instead.

## Authentication

Authentication is Supabase-backed (email OTP, phone OTP, and password login/reset flows).
Use a real account created through the app; there is no mock-auth bypass.

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated routes with bottom nav
│   │   ├── home/
│   │   ├── search/
│   │   ├── profile/
│   │   ├── messages/
│   │   ├── activities/
│   │   ├── notifications/
│   │   ├── membership/
│   │   └── settings/
│   ├── onboarding/
│   ├── login/
│   ├── signup/
│   └── profile/complete/
├── components/
├── contexts/
├── data/
├── lib/
└── types/
```

## Features

### Social Media Integration
- **Open Graph Images** - Optimized preview images for WhatsApp, Facebook, Instagram
- **Dynamic Profile Metadata** - Each profile has custom OG tags with photo, name, and details
- **WhatsApp Profile Sharing** - Context-aware messaging with profile links

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for deployment instructions and [TESTING_SOCIAL_PREVIEWS.md](TESTING_SOCIAL_PREVIEWS.md) for testing social media previews.

## Documentation

- **[LOCAL_DEVELOPMENT_GUIDE.md](LOCAL_DEVELOPMENT_GUIDE.md)** - 🔥 **START HERE** - Local development setup with production mode
- **[CLICK_ISSUE_RESOLVED.md](CLICK_ISSUE_RESOLVED.md)** - Click events issue resolution (Turbopack bug workaround)
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions for Vercel/Netlify/Custom server
- **[TESTING_SOCIAL_PREVIEWS.md](TESTING_SOCIAL_PREVIEWS.md)** - Guide to test and troubleshoot social media link previews
- **[SOCIAL_MEDIA_PREVIEW_FIX.md](SOCIAL_MEDIA_PREVIEW_FIX.md)** - Summary of social media preview implementation
- **[OG_IMAGES_SETUP.md](OG_IMAGES_SETUP.md)** - Open Graph images setup and configuration
- **[WHATSAPP_PROFILE_LINK.md](WHATSAPP_PROFILE_LINK.md)** - WhatsApp integration details
- **[SUBSCRIPTION_POLICY_REFERENCE.md](SUBSCRIPTION_POLICY_REFERENCE.md)** - Account-level subscription and quota policy

## Supabase Integration

The application uses Supabase for backend services:

- `profiles` - User profiles with dynamic OG metadata
- `interests` - Sent/received interests
- `messages` - Chat messages
- `notifications` - User notifications
- `subscription_plans` - Active subscription catalog for member/admin flows
- `user_subscriptions` - Account-level entitlements
- `payment_transactions` - Payment ledger and refund tracking
- `profile_deletion_requests` - Member initiated deletion workflow

## Operational Commands

```bash
# Lint checks
npm run lint

# Production build validation
npm run build

# Verify control-center Supabase schema (tables + required columns)
npm run verify:schema
```

## Webhook Hardening Notes

- `/api/payments/webhook/[provider]` now enforces signature validation and duplicate-event protection.
- Configure the matching secret per provider:
  - `RAZORPAY_WEBHOOK_SECRET`
  - `CASHFREE_WEBHOOK_SECRET`
  - `STRIPE_WEBHOOK_SECRET`
