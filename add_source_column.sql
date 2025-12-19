-- Add source column to returns table
ALTER TABLE returns 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'portal';

-- Add comment
COMMENT ON COLUMN returns.source IS 'Source of the return: portal, ikas, or manual';
