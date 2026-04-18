# Full-Stack Implementation Guide
## Making LingayatShaadi Fully Functional with Supabase

---

## 📊 Current Status

### ✅ What's Already Built
- Complete UI/UX for all pages (onboarding, profile, search, messages, etc.)
- TypeScript types matching Supabase schema
- Mock data system working perfectly
- Supabase client setup (`@supabase/supabase-js` installed)
- Photo upload API using Supabase Storage
- Git repository with Vercel deployment

### ❌ What Needs Implementation
- Supabase database tables
- Real authentication (replace localStorage mock)
- Database queries (replace mock data)
- Row Level Security (RLS) policies
- Storage bucket configuration

---

## 🎯 Implementation Roadmap

### Phase 1: Database Setup (Foundation)
**Goal:** Create all database tables and storage buckets

**What to do:**
1. Create Supabase project at https://supabase.com
2. Copy environment variables to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. Run the SQL schema (see Database Schema section below)
4. Create storage buckets:
   - `profile-photos` (public)
   - `profile-documents` (private)

**Test:**
- ✅ Can manually insert data in Supabase dashboard
- ✅ Can query data from Supabase SQL editor

---

### Phase 2: Authentication
**Goal:** Replace mock login with real OTP-based auth

**Files to modify:**
- `src/contexts/AuthContext.tsx`
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`

**What to implement:**
```typescript
// Sign up with OTP
await supabase.auth.signInWithOtp({ email })

// Verify OTP
await supabase.auth.verifyOtp({ email, token, type: 'email' })

// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  // Update user state
})

// Logout
await supabase.auth.signOut()
```

**Test locally:**
- ✅ Sign up → receive OTP email
- ✅ Enter OTP → logged in
- ✅ Refresh page → still logged in
- ✅ Logout → redirected to login

**Deploy to Vercel:**
- Add same environment variables in Vercel dashboard
- Test same flows on production URL

---

### Phase 3: Profile Management
**Goal:** Store and display real profile data

**Files to modify:**
- `src/app/profile/complete/page.tsx` (create profile)
- `src/app/(app)/profile/edit/page.tsx` (update profile)
- `src/app/(app)/profile/[id]/page.tsx` (view profile)
- `src/app/(app)/search/page.tsx` (search profiles)

**Create API file:** `src/lib/api/profiles.ts`
```typescript
// Create profile
export async function createProfile(profile: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single()
  return { data, error }
}

// Get profile by ID
export async function getProfileById(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

// Update profile
export async function updateProfile(id: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// Search profiles with filters
export async function searchProfiles(filters: any) {
  let query = supabase.from('profiles').select('*')
  
  if (filters.gender) query = query.eq('gender', filters.gender)
  if (filters.ageMin) query = query.gte('dateOfBirth', calculateDate(filters.ageMin))
  if (filters.city) query = query.eq('city', filters.city)
  
  const { data, error } = await query
  return { data, error }
}
```

**Test locally:**
- ✅ Complete profile → saved to Supabase
- ✅ Edit profile → changes reflected
- ✅ Upload photo → stored in Supabase Storage
- ✅ Search profiles → returns filtered results
- ✅ View another profile → shows correct data

**Deploy to Vercel:** Test same flows

---

### Phase 4: Interests & Matching
**Goal:** Send/receive interests between users

**Files to modify:**
- `src/app/(app)/activities/page.tsx`
- `src/app/(app)/profile/[id]/page.tsx` (add "Send Interest" button)

**Create API file:** `src/lib/api/interests.ts`
```typescript
// Send interest
export async function sendInterest(fromId: string, toId: string, message?: string) {
  const { data, error } = await supabase
    .from('interests')
    .insert({ from_id: fromId, to_id: toId, message, status: 'pending' })
    .select()
    .single()
  return { data, error }
}

// Get received interests
export async function getReceivedInterests(userId: string) {
  const { data, error } = await supabase
    .from('interests')
    .select('*, from_profile:profiles!interests_from_id_fkey(*)')
    .eq('to_id', userId)
  return { data, error }
}

// Accept interest
export async function acceptInterest(interestId: string) {
  const { data, error } = await supabase
    .from('interests')
    .update({ status: 'accepted' })
    .eq('id', interestId)
    .select()
    .single()
  return { data, error }
}
```

**Test locally:**
- ✅ Send interest → saved to database
- ✅ Receive interest → shows in activities
- ✅ Accept interest → status updated, contact visible
- ✅ Decline interest → status updated

**Deploy to Vercel:** Test same flows

---

### Phase 5: Messaging
**Goal:** Enable chat between matched users

**Files to modify:**
- `src/app/(app)/messages/page.tsx`
- `src/app/(app)/messages/[id]/page.tsx`

**Create API file:** `src/lib/api/messages.ts`
```typescript
// Send message
export async function sendMessage(senderId: string, receiverId: string, content: string) {
  const conversationId = [senderId, receiverId].sort().join('_')
  
  const { data, error } = await supabase
    .from('messages')
    .insert({ 
      conversation_id: conversationId,
      sender_id: senderId, 
      receiver_id: receiverId, 
      content 
    })
    .select()
    .single()
  return { data, error }
}

// Get conversations
export async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  return { data, error }
}

// Get messages in conversation
export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  return { data, error }
}
```

**Optional:** Add real-time messaging
```typescript
// Subscribe to new messages
const channel = supabase
  .channel('messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      // Add new message to UI
    }
  )
  .subscribe()
```

**Test locally:**
- ✅ Send message → saved and displayed
- ✅ View conversation → all messages load
- ✅ Real-time updates work (if implemented)

**Deploy to Vercel:** Test same flows

---

### Phase 6: Notifications
**Goal:** Notify users of important events

**Files to modify:**
- `src/app/(app)/notifications/page.tsx`

**Create API file:** `src/lib/api/notifications.ts`
```typescript
// Create notification (called by other features)
export async function createNotification(userId: string, type: string, title: string, message: string) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, title, message })
    .select()
    .single()
  return { data, error }
}

// Get user notifications
export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// Mark as read
export async function markNotificationRead(id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
  return { data, error }
}
```

**Trigger notifications when:**
- New interest received → "X sent you an interest"
- Interest accepted → "X accepted your interest"
- New message → "New message from X"
- Profile viewed → "X viewed your profile" (premium only)

**Test locally:**
- ✅ Action triggers notification → shows in list
- ✅ Unread badge count works
- ✅ Mark as read → badge updates

**Deploy to Vercel:** Test same flows

---

### Phase 7: Membership & Subscriptions
**Goal:** Differentiate free vs premium users

**Files to modify:**
- `src/app/(app)/membership/page.tsx`

**What to implement:**
1. Store membership plans in `membership_plans` table
2. Track user subscription in `user_subscriptions` table
3. Check subscription before premium features:
   ```typescript
   // Check if user is premium
   export async function isPremiumUser(userId: string) {
     const { data } = await supabase
       .from('user_subscriptions')
       .select('*')
       .eq('user_id', userId)
       .gt('expires_at', new Date().toISOString())
       .single()
     return !!data
   }
   ```

**Premium features:**
- View contact details (after interest accepted)
- Send unlimited interests (free: 5/month)
- See who viewed profile
- Priority in search results
- Verified badge

**Test locally:**
- ✅ Premium user sees all features
- ✅ Free user sees limited features
- ✅ Plans display correctly

**Deploy to Vercel:** Test same flows

---

### Phase 8: Additional Features

**Implement:**
- Profile views tracking
- Shortlist/favorite profiles
- Block users
- Superadmin panel features

**Test locally and deploy**

---

### Phase 9: Row Level Security (RLS)
**Goal:** Secure all data access

**Apply RLS policies** (see RLS Policies section below)

**Test:**
- ✅ Users can only update their own profile
- ✅ Users can only see their own messages
- ✅ Blocked data access returns error

---

### Phase 10: Polish
**Goal:** Production-ready

- Add error handling
- Optimize queries
- Add loading states (already have skeletons)
- Set up analytics
- Performance testing

---

## 🗄️ Database Schema (SQL)

Run this in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  public_id TEXT UNIQUE, -- LS26010001 format
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  marital_status TEXT,
  caste TEXT,
  sub_caste TEXT,
  height TEXT,
  languages_known TEXT,
  mother_tongue TEXT,
  about_me TEXT,
  about_me_visible BOOLEAN DEFAULT true,
  hobbies TEXT[], -- Array of hobbies
  
  -- Horoscope
  time_of_birth TEXT,
  place_of_birth TEXT,
  rashi TEXT,
  nakshatra TEXT,
  horoscope_other_details TEXT,
  
  -- Education & Career
  qualification TEXT,
  profession_type TEXT,
  profession TEXT,
  company_name TEXT,
  annual_income TEXT,
  
  -- Family
  father_name TEXT,
  father_occupation TEXT,
  mother_name TEXT,
  mother_occupation TEXT,
  food_habits TEXT,
  sibling_details TEXT,
  family_other_details TEXT,
  
  -- Location
  address TEXT,
  city TEXT,
  district TEXT,
  state TEXT,
  country TEXT,
  
  -- Contact
  contact TEXT,
  contact_type TEXT,
  
  -- Profile metadata
  profile_photo TEXT, -- URL to Supabase Storage
  photos TEXT[], -- Array of photo URLs
  verified BOOLEAN DEFAULT false,
  profile_status TEXT CHECK (profile_status IN ('verified', 'pending', 'rejected', 'suspended')),
  profile_type TEXT DEFAULT 'free' CHECK (profile_type IN ('free', 'premium')),
  trust_score INTEGER DEFAULT 0,
  managed_by TEXT CHECK (managed_by IN ('self', 'parent', 'guardian')),
  account_holder_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'superadmin')),
  
  -- Partner preferences (JSONB for flexibility)
  partner_preference JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interests table
CREATE TABLE interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL, -- "userId1_userId2" sorted
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'interest_received', 'interest_accepted', 'new_message', 'profile_viewed'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membership plans table
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration INTEGER NOT NULL, -- months
  price NUMERIC NOT NULL,
  features TEXT[] NOT NULL, -- Array of feature descriptions
  popular BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES membership_plans(id),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile views tracking
CREATE TABLE profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked users table
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Shortlisted profiles table
CREATE TABLE shortlisted_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, profile_id)
);

-- Indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_interests_from_id ON interests(from_id);
CREATE INDEX idx_interests_to_id ON interests(to_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles table
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔒 Row Level Security (RLS) Policies

Run after creating tables:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlisted_profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Interests policies
CREATE POLICY "Users can view their sent/received interests" ON interests 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id IN (from_id, to_id)
    )
  );
CREATE POLICY "Users can send interests" ON interests FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM profiles WHERE id = from_id)
);
CREATE POLICY "Users can update interests they received" ON interests 
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = to_id)
  );

-- Messages policies
CREATE POLICY "Users can view their own messages" ON messages 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id IN (sender_id, receiver_id)
    )
  );
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM profiles WHERE id = sender_id)
);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications 
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = user_id)
  );
CREATE POLICY "Users can update their own notifications" ON notifications 
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = user_id)
  );

-- Membership plans (public read)
CREATE POLICY "Anyone can view membership plans" ON membership_plans FOR SELECT USING (true);

-- User subscriptions
CREATE POLICY "Users can view their own subscription" ON user_subscriptions 
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = user_id)
  );
```

---

## 🔄 Development Workflow

### For each feature:

**1. Local Development**
```bash
# Start development server
npm run dev

# Open http://localhost:3000
# Test the feature
# Check Supabase dashboard for data
```

**2. Commit Changes**
```bash
git add .
git commit -m "feat: implement [feature name]"
```

**3. Deploy to Vercel**
```bash
git push origin main
# Vercel auto-deploys
# Test on production URL: test.ligayatshaadi.in
```

**4. Verify Environment Variables**
- Local: `.env.local` file
- Vercel: Project Settings → Environment Variables

---

## 📋 Feature Priority Matrix

| Feature | Priority | Phase | Complexity |
|---------|----------|-------|------------|
| Database Setup | P0 | 1 | Low |
| Authentication | P0 | 2 | Medium |
| Profile CRUD | P0 | 3 | Medium |
| Search Profiles | P0 | 3 | Medium |
| Send/Receive Interests | P1 | 4 | Low |
| Basic Messaging | P1 | 5 | Medium |
| Notifications | P1 | 6 | Low |
| Membership Plans | P1 | 7 | Medium |
| Profile Views | P2 | 8 | Low |
| Shortlist/Block | P2 | 8 | Low |
| Superadmin Panel | P2 | 8 | High |
| RLS Policies | P0 | 9 | Medium |
| Real-time Messages | P2 | 5 | High |
| Payment Integration | P2 | 7 | High |

---

## 🎯 Quick Start Guide

### First 3 Steps:

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Copy API keys

2. **Run Database Schema**
   - Open Supabase SQL Editor
   - Paste and run the SQL schema above
   - Verify tables created

3. **Configure Environment Variables**
   ```bash
   # Create .env.local
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

**Then start with Phase 2 (Authentication)!**

---

## 📞 Need Help?

- Check Supabase docs: https://supabase.com/docs
- Test queries in Supabase SQL Editor
- Use Supabase Table Editor to view data
- Check browser console for errors
- Use `console.log(data, error)` to debug

---

## ✅ Testing Checklist Template

For each phase:

**Local Testing:**
- [ ] Feature works as expected
- [ ] Data saved to Supabase correctly
- [ ] UI updates properly
- [ ] No console errors
- [ ] Edge cases handled

**Vercel Testing:**
- [ ] Feature works on production
- [ ] Environment variables set correctly
- [ ] Same as local behavior
- [ ] Performance acceptable

---

**Ready to start? Begin with Phase 1 - Database Setup!**
