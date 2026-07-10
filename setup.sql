-- Run this in your Supabase SQL Editor to create the necessary table

CREATE TABLE progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT UNIQUE NOT NULL, -- e.g. '2026-07-06'
  completed BOOLEAN DEFAULT FALSE,
  subject_status JSONB DEFAULT '{}'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: Since you're using this from a frontend static site without authentication, 
-- you'll need to enable Row Level Security (RLS) but allow anonymous access 
-- so your static site can insert and read data.
-- Alternatively, turn off RLS for the `progress` table if it's just for this simple app.

-- Run this to allow anonymous read and write access if RLS is enabled:
CREATE POLICY "Enable read access for all users" ON "public"."progress"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for all users" ON "public"."progress"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON "public"."progress"
AS PERMISSIVE FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
