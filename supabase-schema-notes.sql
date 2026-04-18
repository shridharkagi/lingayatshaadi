-- Additional schema for Profile Views, Shortlist, Blocked, Notes
-- Run in Supabase SQL Editor after main schema from FULL_STACK_IMPLEMENTATION.md

-- RLS policies for profile_views, shortlisted_profiles, blocked_users
-- (tables already created in main schema)

DROP POLICY IF EXISTS "Users can manage profile_views" ON profile_views;
CREATE POLICY "Users can insert profile views" ON profile_views FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM profiles WHERE id = viewer_id)
);
CREATE POLICY "Users can view profile views on their profile" ON profile_views FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM profiles WHERE id = viewed_id) OR
  auth.uid() = (SELECT user_id FROM profiles WHERE id = viewer_id)
);

DROP POLICY IF EXISTS "Users can manage shortlist" ON shortlisted_profiles;
CREATE POLICY "Users can manage shortlist" ON shortlisted_profiles FOR ALL USING (
  auth.uid() = (SELECT user_id FROM profiles WHERE id = user_id)
);

DROP POLICY IF EXISTS "Users can manage blocked" ON blocked_users;
CREATE POLICY "Users can manage blocked" ON blocked_users FOR ALL USING (
  auth.uid() = (SELECT user_id FROM profiles WHERE id = blocker_id)
);

-- Profile notes table (required for Activities > My Notes)
CREATE TABLE IF NOT EXISTS profile_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_notes_user ON profile_notes(user_id);

ALTER TABLE profile_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notes" ON profile_notes
  FOR ALL USING (
    profile_notes.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Contact views table (contacts I've viewed)
CREATE TABLE IF NOT EXISTS contact_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(viewer_id, viewed_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_views_viewer ON contact_views(viewer_id);
ALTER TABLE contact_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their contact views" ON contact_views
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = viewer_id)
  );

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report profiles" ON reports FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM profiles WHERE id = reporter_id)
);
