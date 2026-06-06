-- ============================================================
-- Group60 — The Investigator
-- Supabase Migration: 001_init
-- ============================================================

-- Table 1: raw scraped content
CREATE TABLE scraped_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  raw_content text,
  page_count integer,
  scraped_at timestamptz DEFAULT now(),
  UNIQUE(url)
);

-- Table 2: structured analysis results
CREATE TABLE scraped_structured (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  trust_score integer,
  risk_level text,
  confidence text,
  heatmap jsonb,
  site_data jsonb,
  verdict text,
  report jsonb,
  recommendation text,
  explain_like_grandmother text,
  red_flags jsonb,
  positive_findings jsonb,
  products jsonb,
  timestamp timestamptz DEFAULT now(),
  UNIQUE(url)
);

-- Enable Row Level Security
ALTER TABLE scraped_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_structured ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON scraped_raw
  FOR ALL USING (true);
CREATE POLICY "Service role full access" ON scraped_structured
  FOR ALL USING (true);
