-- Create hair journey sessions table
CREATE TABLE IF NOT EXISTS hair_journey_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT, -- Optional user identifier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Image URLs
    original_image_url TEXT NOT NULL,
    final_result_url TEXT NOT NULL,
    
    -- Processing details
    iterations_count INTEGER NOT NULL DEFAULT 0,
    view_type TEXT NOT NULL CHECK (view_type IN ('front', 'back')),
    processing_time_ms NUMERIC NOT NULL DEFAULT 0,
    quality_mode TEXT DEFAULT 'balanced',
    
    -- Iteration data (JSONB for flexible storage)
    iterations_data JSONB DEFAULT '[]'::jsonb,
    
    -- Status and metadata
    status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hair_journey_user_id ON hair_journey_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_hair_journey_created_at ON hair_journey_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hair_journey_status ON hair_journey_sessions(status);
CREATE INDEX IF NOT EXISTS idx_hair_journey_view_type ON hair_journey_sessions(view_type);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_hair_journey_sessions_updated_at ON hair_journey_sessions;
CREATE TRIGGER update_hair_journey_sessions_updated_at
    BEFORE UPDATE ON hair_journey_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for hair journey files (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hair-journey', 'hair-journey', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies (allow authenticated and anonymous access for now)
-- In production, you should restrict these policies based on your authentication system
CREATE POLICY "Hair journey files are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'hair-journey');

CREATE POLICY "Anyone can upload hair journey files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'hair-journey');

CREATE POLICY "Anyone can update hair journey files" ON storage.objects
FOR UPDATE USING (bucket_id = 'hair-journey');

CREATE POLICY "Anyone can delete hair journey files" ON storage.objects
FOR DELETE USING (bucket_id = 'hair-journey');