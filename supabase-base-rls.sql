-- Base RLS policies extracted from FULL_STACK_IMPLEMENTATION.md
-- Run this after supabase-base-schema.sql.

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlisted_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Interests policies
DROP POLICY IF EXISTS "Users can view their sent/received interests" ON interests;
DROP POLICY IF EXISTS "Users can send interests" ON interests;
DROP POLICY IF EXISTS "Users can update interests they received" ON interests;
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
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
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
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = user_id)
  );
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = user_id)
  );

-- Membership plans (public read)
DROP POLICY IF EXISTS "Anyone can view membership plans" ON membership_plans;
CREATE POLICY "Anyone can view membership plans" ON membership_plans FOR SELECT USING (true);

-- User subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = user_id)
  );
