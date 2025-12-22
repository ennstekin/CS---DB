-- Migration: Add missing indexes for performance optimization
-- Date: 2024-12-22

-- Index for soft delete queries on mails
CREATE INDEX IF NOT EXISTS idx_mails_deleted_at ON mails(deleted_at);

-- Index for mail-ticket relationship
CREATE INDEX IF NOT EXISTS idx_mails_ticket_id ON mails(ticket_id);

-- Index for mail assignment queries
CREATE INDEX IF NOT EXISTS idx_mails_assigned_to_id ON mails(assigned_to_id);

-- Index for call assignment queries
CREATE INDEX IF NOT EXISTS idx_calls_assigned_to_id ON calls(assigned_to_id);

-- Composite index for returns filtering
CREATE INDEX IF NOT EXISTS idx_returns_status_refund_status ON returns(status, refund_status);

-- Index for customer creation date queries
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Composite index for order filtering
CREATE INDEX IF NOT EXISTS idx_orders_status_payment_status ON orders(status, payment_status);

-- Index for ticket customer email lookups
CREATE INDEX IF NOT EXISTS idx_tickets_customer_email ON tickets(customer_email);

-- Index for ticket status queries
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Index for ticket last activity (for sorting)
CREATE INDEX IF NOT EXISTS idx_tickets_last_activity_at ON tickets(last_activity_at);
