-- Add missing columns to zoom_webinars table
-- These columns are being set in the sync process but don't exist in the table

-- Add host name columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'host_first_name') THEN
        ALTER TABLE zoom_webinars ADD COLUMN host_first_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'host_last_name') THEN
        ALTER TABLE zoom_webinars ADD COLUMN host_last_name TEXT;
    END IF;
END $$;

-- Add actual timing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'actual_start_time') THEN
        ALTER TABLE zoom_webinars ADD COLUMN actual_start_time TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'actual_duration') THEN
        ALTER TABLE zoom_webinars ADD COLUMN actual_duration INTEGER;
    END IF;
END $$;

-- Add URL columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'join_url') THEN
        ALTER TABLE zoom_webinars ADD COLUMN join_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'registration_url') THEN
        ALTER TABLE zoom_webinars ADD COLUMN registration_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'start_url') THEN
        ALTER TABLE zoom_webinars ADD COLUMN start_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'password') THEN
        ALTER TABLE zoom_webinars ADD COLUMN password TEXT;
    END IF;
END $$;

-- Add configuration columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'is_simulive') THEN
        ALTER TABLE zoom_webinars ADD COLUMN is_simulive BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'host_name') THEN
        ALTER TABLE zoom_webinars ADD COLUMN host_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'webinar_created_at') THEN
        ALTER TABLE zoom_webinars ADD COLUMN webinar_created_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add settings columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'approval_type') THEN
        ALTER TABLE zoom_webinars ADD COLUMN approval_type INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'registration_type') THEN
        ALTER TABLE zoom_webinars ADD COLUMN registration_type INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'auto_recording_type') THEN
        ALTER TABLE zoom_webinars ADD COLUMN auto_recording_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'enforce_login') THEN
        ALTER TABLE zoom_webinars ADD COLUMN enforce_login BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'on_demand') THEN
        ALTER TABLE zoom_webinars ADD COLUMN on_demand BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'practice_session') THEN
        ALTER TABLE zoom_webinars ADD COLUMN practice_session BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'hd_video') THEN
        ALTER TABLE zoom_webinars ADD COLUMN hd_video BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'host_video') THEN
        ALTER TABLE zoom_webinars ADD COLUMN host_video BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'panelists_video') THEN
        ALTER TABLE zoom_webinars ADD COLUMN panelists_video BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'audio_type') THEN
        ALTER TABLE zoom_webinars ADD COLUMN audio_type TEXT DEFAULT 'both';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'language') THEN
        ALTER TABLE zoom_webinars ADD COLUMN language TEXT DEFAULT 'en-US';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'contact_name') THEN
        ALTER TABLE zoom_webinars ADD COLUMN contact_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'contact_email') THEN
        ALTER TABLE zoom_webinars ADD COLUMN contact_email TEXT;
    END IF;
END $$;

-- Create index on actual_start_time for better query performance
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_actual_start_time ON zoom_webinars(actual_start_time);

-- Create index on host_name for better query performance
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_host_name ON zoom_webinars(host_name);

-- Update RLS policy to ensure users can read all columns
-- This ensures that the new columns are accessible through the existing RLS policies

-- IMPORTANT: Log current state of actual_duration column
DO $$ 
BEGIN
    RAISE NOTICE 'Checking actual_duration column...';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'actual_duration') THEN
        RAISE NOTICE 'actual_duration column EXISTS with data type: %', (
            SELECT data_type FROM information_schema.columns 
            WHERE table_name = 'zoom_webinars' AND column_name = 'actual_duration'
        );
    ELSE
        RAISE NOTICE 'actual_duration column DOES NOT EXIST';
    END IF;
END $$;
