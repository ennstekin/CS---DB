-- ==================== FULL DATABASE MIGRATION ====================
-- Smart CS Dashboard - Complete Database Schema

-- ==================== USER & AUTH ====================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'AGENT', -- ADMIN, SUPERVISOR, AGENT

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== CUSTOMER ====================

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ikas_customer_id TEXT UNIQUE,

  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,

  -- Metadata
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  lifetime_value DECIMAL(10, 2) DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contact_at TIMESTAMP WITH TIME ZONE
);

-- ==================== ORDER (IKAS) ====================

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ikas_order_id TEXT UNIQUE NOT NULL,
  order_number TEXT UNIQUE NOT NULL,

  customer_id TEXT NOT NULL REFERENCES customers(id),

  status TEXT NOT NULL, -- OrderStatus enum values
  payment_status TEXT NOT NULL, -- PaymentStatus enum values
  fulfillment_status TEXT NOT NULL, -- FulfillmentStatus enum values

  total_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TRY',

  shipping_address JSONB,
  billing_address JSONB,

  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  ikas_product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT,

  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,

  image_url TEXT
);

-- ==================== CALL (TELEFON) ====================

CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  customer_id TEXT REFERENCES customers(id),
  order_id TEXT REFERENCES orders(id),
  assigned_to_id TEXT REFERENCES users(id),

  -- Call Info
  direction TEXT NOT NULL, -- INBOUND, OUTBOUND
  phone_number TEXT NOT NULL,
  duration INTEGER, -- seconds
  status TEXT NOT NULL, -- CallStatus enum

  -- AI Processing
  is_ai_handled BOOLEAN DEFAULT false,
  audio_url TEXT,
  transcript_text TEXT,
  ai_summary TEXT,
  ai_sentiment TEXT, -- POSITIVE, NEUTRAL, NEGATIVE

  -- Twilio Integration
  twilio_call_sid TEXT UNIQUE,
  twilio_status TEXT,

  -- Matching
  is_matched_with_order BOOLEAN DEFAULT false,
  match_confidence REAL, -- 0-1

  call_started_at TIMESTAMP WITH TIME ZONE,
  call_ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== MAIL ====================

CREATE TABLE IF NOT EXISTS mails (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  customer_id TEXT REFERENCES customers(id),
  order_id TEXT REFERENCES orders(id),
  assigned_to_id TEXT REFERENCES users(id),

  -- Mail Info
  direction TEXT NOT NULL, -- INBOUND, OUTBOUND
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,

  status TEXT NOT NULL, -- NEW, OPEN, PENDING, RESOLVED, CLOSED
  priority TEXT DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT

  -- AI Processing
  is_ai_analyzed BOOLEAN DEFAULT false,
  ai_category TEXT, -- ORDER_INQUIRY, COMPLAINT, RETURN_REQUEST, etc.
  ai_summary TEXT,
  ai_sentiment TEXT,

  -- Order Matching
  suggested_order_ids TEXT[],
  is_matched_with_order BOOLEAN DEFAULT false,
  match_confidence REAL,

  -- Mail Metadata
  message_id TEXT UNIQUE,
  in_reply_to TEXT,
  mail_references TEXT[],
  attachments JSONB,
  labels TEXT[],
  flags TEXT[],

  received_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== RETURN (İADE) ====================

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

CREATE TABLE IF NOT EXISTS return_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  return_id TEXT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,

  product_name TEXT NOT NULL,
  variant_name TEXT,
  quantity INTEGER NOT NULL,
  refund_amount DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS return_timeline (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  return_id TEXT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  event_data JSONB,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== NOTES ====================

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  user_id TEXT NOT NULL REFERENCES users(id),

  customer_id TEXT REFERENCES customers(id),
  order_id TEXT REFERENCES orders(id),
  call_id TEXT REFERENCES calls(id),
  mail_id TEXT REFERENCES mails(id),
  return_id TEXT REFERENCES returns(id),

  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== KPI & ANALYTICS ====================

CREATE TABLE IF NOT EXISTS daily_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE UNIQUE NOT NULL,

  -- Call Metrics
  total_calls INTEGER DEFAULT 0,
  answered_calls INTEGER DEFAULT 0,
  missed_calls INTEGER DEFAULT 0,
  ai_handled_calls INTEGER DEFAULT 0,
  avg_call_duration REAL DEFAULT 0,

  -- Mail Metrics
  total_mails INTEGER DEFAULT 0,
  resolved_mails INTEGER DEFAULT 0,
  avg_response_time REAL DEFAULT 0,

  -- AI Performance
  ai_match_accuracy REAL DEFAULT 0,
  ai_call_success REAL DEFAULT 0,

  -- Order Metrics
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== SETTINGS ====================

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== INDEXES ====================

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_ikas_customer_id ON customers(ikas_customer_id);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_ikas_order_id ON orders(ikas_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Calls
CREATE INDEX IF NOT EXISTS idx_calls_customer_id ON calls(customer_id);
CREATE INDEX IF NOT EXISTS idx_calls_order_id ON calls(order_id);
CREATE INDEX IF NOT EXISTS idx_calls_phone_number ON calls(phone_number);
CREATE INDEX IF NOT EXISTS idx_calls_call_started_at ON calls(call_started_at);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- Mails
CREATE INDEX IF NOT EXISTS idx_mails_customer_id ON mails(customer_id);
CREATE INDEX IF NOT EXISTS idx_mails_order_id ON mails(order_id);
CREATE INDEX IF NOT EXISTS idx_mails_from_email ON mails(from_email);
CREATE INDEX IF NOT EXISTS idx_mails_status ON mails(status);
CREATE INDEX IF NOT EXISTS idx_mails_received_at ON mails(received_at);

-- Returns
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_source ON returns(source);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);

-- Return Items
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);

-- Return Timeline
CREATE INDEX IF NOT EXISTS idx_return_timeline_return_id ON return_timeline(return_id);
CREATE INDEX IF NOT EXISTS idx_return_timeline_created_at ON return_timeline(created_at);

-- Notes
CREATE INDEX IF NOT EXISTS idx_notes_customer_id ON notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_notes_order_id ON notes(order_id);

-- Daily Metrics
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);

-- Settings
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ==================== COMMENTS ====================

COMMENT ON COLUMN returns.source IS 'Source of the return: portal, ikas, or manual';
COMMENT ON COLUMN returns.status IS 'REQUESTED, PENDING_APPROVAL, APPROVED, REJECTED, IN_TRANSIT, RECEIVED, COMPLETED, CANCELLED';
COMMENT ON COLUMN returns.refund_status IS 'PENDING, PROCESSING, COMPLETED, FAILED';
