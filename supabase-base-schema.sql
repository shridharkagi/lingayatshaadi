-- Base schema extracted from FULL_STACK_IMPLEMENTATION.md
-- Run this first on a fresh Supabase project.

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
