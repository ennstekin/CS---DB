-- =====================================================
-- Professional Background Queue System
-- =====================================================

-- 1. İkas Order Cache Table
CREATE TABLE IF NOT EXISTS ikas_order_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_id UUID UNIQUE REFERENCES mails(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  order_data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ikas_order_cache
CREATE INDEX IF NOT EXISTS idx_order_cache_mail_id ON ikas_order_cache(mail_id);
CREATE INDEX IF NOT EXISTS idx_order_cache_order_number ON ikas_order_cache(order_number);
CREATE INDEX IF NOT EXISTS idx_order_cache_expires_at ON ikas_order_cache(expires_at);

-- 2. Background Job Queue Table
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL, -- 'fetch_ikas_order', 'process_mail', etc.
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER NOT NULL DEFAULT 0, -- Higher = more important
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for job_queue
CREATE INDEX IF NOT EXISTS idx_queue_status_priority ON job_queue(status, priority DESC, scheduled_at ASC);
CREATE INDEX IF NOT EXISTS idx_queue_job_type ON job_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_queue_created_at ON job_queue(created_at);

-- 3. Auto-update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ikas_order_cache_updated_at BEFORE UPDATE ON ikas_order_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_queue_updated_at BEFORE UPDATE ON job_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Function to enqueue job
CREATE OR REPLACE FUNCTION enqueue_job(
  p_job_type TEXT,
  p_payload JSONB,
  p_priority INTEGER DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO job_queue (job_type, payload, priority)
  VALUES (p_job_type, p_payload, p_priority)
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to get next job from queue
CREATE OR REPLACE FUNCTION dequeue_job(
  p_job_types TEXT[] DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  job_type TEXT,
  payload JSONB,
  attempts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH next_job AS (
    SELECT jq.id
    FROM job_queue jq
    WHERE jq.status = 'pending'
      AND jq.scheduled_at <= NOW()
      AND jq.attempts < jq.max_attempts
      AND (p_job_types IS NULL OR jq.job_type = ANY(p_job_types))
    ORDER BY jq.priority DESC, jq.scheduled_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE job_queue jq
  SET
    status = 'processing',
    started_at = NOW(),
    attempts = jq.attempts + 1,
    updated_at = NOW()
  FROM next_job
  WHERE jq.id = next_job.id
  RETURNING jq.id, jq.job_type, jq.payload, jq.attempts;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to mark job as completed
CREATE OR REPLACE FUNCTION complete_job(
  p_job_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE job_queue
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to mark job as failed
CREATE OR REPLACE FUNCTION fail_job(
  p_job_id UUID,
  p_error_message TEXT
) RETURNS VOID AS $$
DECLARE
  v_attempts INTEGER;
  v_max_attempts INTEGER;
BEGIN
  SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
  FROM job_queue
  WHERE id = p_job_id;

  IF v_attempts >= v_max_attempts THEN
    -- Permanent failure
    UPDATE job_queue
    SET
      status = 'failed',
      error_message = p_error_message,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_job_id;
  ELSE
    -- Retry with exponential backoff
    UPDATE job_queue
    SET
      status = 'pending',
      error_message = p_error_message,
      scheduled_at = NOW() + (INTERVAL '1 minute' * POWER(2, v_attempts)),
      updated_at = NOW()
    WHERE id = p_job_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Cleanup old completed jobs (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM job_queue
  WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments & Documentation
-- =====================================================

COMMENT ON TABLE ikas_order_cache IS 'Caches İkas order data to reduce API calls';
COMMENT ON TABLE job_queue IS 'Background job queue for async processing';
COMMENT ON FUNCTION enqueue_job IS 'Add a new job to the queue';
COMMENT ON FUNCTION dequeue_job IS 'Get next job from queue (atomic operation)';
COMMENT ON FUNCTION complete_job IS 'Mark job as successfully completed';
COMMENT ON FUNCTION fail_job IS 'Mark job as failed with retry logic';
COMMENT ON FUNCTION cleanup_old_jobs IS 'Remove old completed/failed jobs';
