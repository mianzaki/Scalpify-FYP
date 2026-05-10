-- GASP-AI Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Create analysis_sessions table
CREATE TABLE IF NOT EXISTS public.analysis_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    ip_address INET,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'processing',
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS public.analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    image_width INTEGER,
    image_height INTEGER,
    bald_regions INTEGER DEFAULT 0,
    hair_regions INTEGER DEFAULT 0,
    baldness_ratio DECIMAL(5,2),
    hair_coverage DECIMAL(5,2),
    bald_area_cm2 DECIMAL(10,2),
    hair_area_cm2 DECIMAL(10,2),
    total_area_cm2 DECIMAL(10,2),
    severity TEXT,
    norwood_scale TEXT,
    original_image_path TEXT,
    annotated_image_path TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON public.analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created_at ON public.analysis_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_session_id ON public.analysis_results(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON public.analysis_results(created_at DESC);

-- Create storage buckets (run these separately if needed)
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('processed', 'processed', true) ON CONFLICT DO NOTHING;

-- Enable RLS (Row Level Security) - optional, for production security
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (you may want to restrict this in production)
CREATE POLICY "Allow all operations on analysis_sessions" ON public.analysis_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on analysis_results" ON public.analysis_results FOR ALL USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for analysis_sessions
CREATE TRIGGER update_analysis_sessions_updated_at 
    BEFORE UPDATE ON public.analysis_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();