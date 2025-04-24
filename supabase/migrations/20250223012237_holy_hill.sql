/*
  # Fix invoice schema

  1. Changes
    - Remove unused columns (status, due_date, created_at)
    - Add invoice_number column with unique constraint per project

  2. Notes
    - All existing invoices will be assigned sequential numbers
    - Invoice numbers must be unique within each project
*/

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