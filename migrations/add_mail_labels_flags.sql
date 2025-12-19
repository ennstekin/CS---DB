-- Add labels and flags columns to mails table
ALTER TABLE mails
ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS flags TEXT[] DEFAULT '{}';

-- Add index for faster label queries
CREATE INDEX IF NOT EXISTS idx_mails_labels ON mails USING GIN (labels);
CREATE INDEX IF NOT EXISTS idx_mails_flags ON mails USING GIN (flags);

-- Add comment
COMMENT ON COLUMN mails.labels IS 'Gmail labels or IMAP folders (e.g., INBOX, SENT, Custom Label)';
COMMENT ON COLUMN mails.flags IS 'IMAP flags (e.g., \Seen, \Flagged, \Answered)';
