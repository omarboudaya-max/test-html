-- schema.sql
-- À exécuter dans le SQL Editor de Supabase

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  test_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  is_cheater BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  html_code TEXT,
  time_spent_seconds INTEGER DEFAULT 0,
  cheat_logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies (Pour faciliter le développement)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Autoriser toutes les opérations publiques (À sécuriser en production)
CREATE POLICY "Public students access" ON students FOR ALL USING (true);
CREATE POLICY "Public submissions access" ON submissions FOR ALL USING (true);
