# LingayatShaadi

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
- React 19
- TypeScript
- Tailwind CSS
- Lucide React (icons)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Login

Use any email and password to login (mock auth). Example: `test@example.com` / `password123`

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

## Future: Supabase Integration

The data types and structure are designed for easy Supabase migration:

- `profiles` - User profiles
- `interests` - Sent/received interests
- `messages` - Chat messages
- `notifications` - User notifications
- `membership_plans` - Subscription plans
