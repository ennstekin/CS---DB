-- ==================== RETURN TABLES ====================

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  customer_id TEXT NOT NULL REFERENCES customers(id),
  order_id TEXT NOT NULL REFERENCES orders(id),

  boomerang_return_id TEXT UNIQUE,

  return_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  reason TEXT NOT NULL,
  reason_detail TEXT,
  source TEXT DEFAULT 'portal', -- portal, ikas, manual

  total_refund_amount DECIMAL(10, 2) NOT NULL,
  refund_status TEXT NOT NULL DEFAULT 'PENDING',

  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create return_items table
CREATE TABLE IF NOT EXISTS return_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  return_id TEXT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,

  product_name TEXT NOT NULL,
  variant_name TEXT,
  quantity INTEGER NOT NULL,
  refund_amount DECIMAL(10, 2) NOT NULL
);

-- Create return_timeline table
CREATE TABLE IF NOT EXISTS return_timeline (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  return_id TEXT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL, -- created, status_changed, note_added, approved, rejected, etc.
  event_data JSONB,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_source ON returns(source);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);

CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);

CREATE INDEX IF NOT EXISTS idx_return_timeline_return_id ON return_timeline(return_id);
CREATE INDEX IF NOT EXISTS idx_return_timeline_created_at ON return_timeline(created_at);

-- Create comments
COMMENT ON COLUMN returns.source IS 'Source of the return: portal, ikas, or manual';
COMMENT ON COLUMN returns.status IS 'REQUESTED, PENDING_APPROVAL, APPROVED, REJECTED, IN_TRANSIT, RECEIVED, COMPLETED, CANCELLED';
COMMENT ON COLUMN returns.refund_status IS 'PENDING, PROCESSING, COMPLETED, FAILED';
