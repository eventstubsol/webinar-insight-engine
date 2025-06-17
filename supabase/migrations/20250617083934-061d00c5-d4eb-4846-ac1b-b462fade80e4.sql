
-- Add missing columns to zoom_webinars table
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS password text,
ADD COLUMN IF NOT EXISTS h323_password text,
ADD COLUMN IF NOT EXISTS pstn_password text,
ADD COLUMN IF NOT EXISTS encrypted_password text,
ADD COLUMN IF NOT EXISTS settings jsonb,
ADD COLUMN IF NOT EXISTS tracking_fields jsonb,
ADD COLUMN IF NOT EXISTS recurrence jsonb,
ADD COLUMN IF NOT EXISTS occurrences jsonb;

-- Add missing columns to zoom_webinar_participants table
ALTER TABLE zoom_webinar_participants 
ADD COLUMN IF NOT EXISTS connection_type text,
ADD COLUMN IF NOT EXISTS data_center text,
ADD COLUMN IF NOT EXISTS pc_name text,
ADD COLUMN IF NOT EXISTS domain text,
ADD COLUMN IF NOT EXISTS mac_addr text,
ADD COLUMN IF NOT EXISTS harddisk_id text,
ADD COLUMN IF NOT EXISTS recording_consent boolean DEFAULT false;

-- Add missing columns to zoom_webinar_registrants table
ALTER TABLE zoom_webinar_registrants 
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS purchasing_time_frame text,
ADD COLUMN IF NOT EXISTS role_in_purchase_process text,
ADD COLUMN IF NOT EXISTS no_of_employees text,
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS org text,
ADD COLUMN IF NOT EXISTS language text;

-- Create zoom_panelists table
CREATE TABLE IF NOT EXISTS zoom_panelists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    webinar_id text NOT NULL,
    panelist_id text,
    panelist_email text,
    name text,
    join_url text,
    raw_data jsonb DEFAULT '{}',
    workspace_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create zoom_chat_messages table
CREATE TABLE IF NOT EXISTS zoom_chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    webinar_id text NOT NULL,
    instance_id text,
    sender_name text,
    sender_email text,
    message text NOT NULL,
    sent_at timestamptz,
    raw_data jsonb DEFAULT '{}',
    workspace_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create zoom_webinar_tracking table
CREATE TABLE IF NOT EXISTS zoom_webinar_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    webinar_id text NOT NULL,
    source_name text,
    tracking_url text,
    visitor_count integer DEFAULT 0,
    registration_count integer DEFAULT 0,
    raw_data jsonb DEFAULT '{}',
    workspace_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_zoom_panelists_webinar_id ON zoom_panelists(webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_panelists_user_id ON zoom_panelists(user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_chat_messages_webinar_id ON zoom_chat_messages(webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_chat_messages_user_id ON zoom_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_chat_messages_sent_at ON zoom_chat_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_zoom_webinar_tracking_webinar_id ON zoom_webinar_tracking(webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_webinar_tracking_user_id ON zoom_webinar_tracking(user_id);

-- Add RLS policies for the new tables
ALTER TABLE zoom_panelists ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_webinar_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for zoom_panelists
CREATE POLICY "Users can view their own panelists" ON zoom_panelists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own panelists" ON zoom_panelists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own panelists" ON zoom_panelists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own panelists" ON zoom_panelists
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for zoom_chat_messages
CREATE POLICY "Users can view their own chat messages" ON zoom_chat_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages" ON zoom_chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat messages" ON zoom_chat_messages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages" ON zoom_chat_messages
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for zoom_webinar_tracking
CREATE POLICY "Users can view their own webinar tracking" ON zoom_webinar_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webinar tracking" ON zoom_webinar_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webinar tracking" ON zoom_webinar_tracking
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webinar tracking" ON zoom_webinar_tracking
    FOR DELETE USING (auth.uid() = user_id);

-- Add foreign key constraints where appropriate (optional, since we're using text webinar_ids)
-- Note: These are commented out since webinar_id is text and may not directly reference the zoom_webinars table
-- You can uncomment these if you want to enforce referential integrity

-- ALTER TABLE zoom_panelists 
--     ADD CONSTRAINT fk_zoom_panelists_workspace 
--     FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- ALTER TABLE zoom_chat_messages 
--     ADD CONSTRAINT fk_zoom_chat_messages_workspace 
--     FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- ALTER TABLE zoom_webinar_tracking 
--     ADD CONSTRAINT fk_zoom_webinar_tracking_workspace 
--     FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Add comments to document the new tables and columns
COMMENT ON TABLE zoom_panelists IS 'Stores information about webinar panelists';
COMMENT ON TABLE zoom_chat_messages IS 'Stores chat messages from webinars';
COMMENT ON TABLE zoom_webinar_tracking IS 'Stores tracking information for webinar sources';

COMMENT ON COLUMN zoom_webinars.settings IS 'Complete webinar settings as JSON';
COMMENT ON COLUMN zoom_webinars.tracking_fields IS 'Custom tracking fields configuration';
COMMENT ON COLUMN zoom_webinars.recurrence IS 'Recurring webinar settings';
COMMENT ON COLUMN zoom_webinars.occurrences IS 'Recurring webinar occurrence data';
