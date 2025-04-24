/*
  # Fix invoice numbering

  1. Changes
    - Add sequence for generating invoice numbers
    - Add trigger to automatically assign invoice numbers
    - Remove unused columns (status, due_date, created_at)

  2. Notes
    - Invoice numbers will be automatically generated in format INV-001, INV-002, etc.
    - Numbers are unique per project
    - Existing invoices will be numbered sequentially
*/

-- Create sequence for invoice numbers per project
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

-- Function to generate the next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  invoice_prefix TEXT := 'INV-';
BEGIN
  -- Get the next number for this project
  SELECT COALESCE(
    (SELECT REGEXP_REPLACE(invoice_number, '^INV-', '')::integer
     FROM invoices 
     WHERE project_id = NEW.project_id
     ORDER BY REGEXP_REPLACE(invoice_number, '^INV-', '')::integer DESC 
     LIMIT 1), 0) + 1
  INTO next_num;
  
  -- Set the invoice number
  NEW.invoice_number := invoice_prefix || LPAD(next_num::text, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set invoice number
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- First check if invoice_number column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'invoice_number'
  ) THEN
    -- Add invoice_number column as nullable
    ALTER TABLE invoices ADD COLUMN invoice_number text;
    
    -- Update existing records with sequential numbers per project
    WITH numbered_invoices AS (
      SELECT 
        id,
        project_id,
        ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY id) as row_num
      FROM invoices
    )
    UPDATE invoices
    SET invoice_number = CONCAT('INV-', LPAD(numbered_invoices.row_num::text, 3, '0'))
    FROM numbered_invoices
    WHERE invoices.id = numbered_invoices.id;
    
    -- Make it required
    ALTER TABLE invoices ALTER COLUMN invoice_number SET NOT NULL;
    
    -- Create a unique constraint for invoice_number within each project
    ALTER TABLE invoices
    ADD CONSTRAINT unique_invoice_number_per_project UNIQUE (project_id, invoice_number);
  END IF;
END $$;

-- Remove unused columns if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'status') THEN
    ALTER TABLE invoices DROP COLUMN status;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'due_date') THEN
    ALTER TABLE invoices DROP COLUMN due_date;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'created_at') THEN
    ALTER TABLE invoices DROP COLUMN created_at;
  END IF;
END $$;