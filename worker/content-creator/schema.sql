CREATE TABLE IF NOT EXISTS saved_scripts (
  id TEXT PRIMARY KEY,
  idea_title TEXT NOT NULL,
  hook TEXT NOT NULL,
  core_content TEXT NOT NULL,
  cta TEXT NOT NULL,
  visual_elements TEXT NOT NULL DEFAULT '[]',
  shot_style TEXT,
  editing_notes TEXT NOT NULL DEFAULT '[]',
  estimated_duration TEXT,
  status TEXT NOT NULL DEFAULT 'none',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saved_scripts_created_at
ON saved_scripts(created_at);