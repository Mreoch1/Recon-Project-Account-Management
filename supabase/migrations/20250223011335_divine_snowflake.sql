/*
  # Simplify invoice structure
  
  1. Changes
    - Remove date tracking (due_date, created_at)
    - Remove status tracking
    - Keep invoice numbers for reference
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing triggers and functions first
DROP TRIGGER IF EXISTS check_invoice_status ON invoices;
DROP FUNCTION IF EXISTS update_invoice_status();
DROP FUNCTION IF EXISTS update_all_invoice_statuses();

-- Remove columns from invoices table
ALTER TABLE invoices
DROP COLUMN status,
DROP COLUMN due_date,
DROP COLUMN created_at;