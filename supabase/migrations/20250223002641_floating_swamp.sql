/*
  # Add invoice number field

  1. Changes
    - Add invoice_number field to invoices table
    - Make it required and unique per project
    - Add index for better performance
    - Handle existing records by generating unique invoice numbers

  2. Notes
    - Invoice numbers must be unique within each project
    - Existing invoices will get numbered sequentially by creation date
*/

-- First add the column as nullable
ALTER TABLE invoices 
ADD COLUMN invoice_number text;

-- Update existing records with sequential numbers per project
WITH numbered_invoices AS (
  SELECT 
    id,
    project_id,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as row_num
  FROM invoices
)
UPDATE invoices
SET invoice_number = CONCAT('INV-', LPAD(numbered_invoices.row_num::text, 3, '0'))
FROM numbered_invoices
WHERE invoices.id = numbered_invoices.id;

-- Now make it required
ALTER TABLE invoices 
ALTER COLUMN invoice_number SET NOT NULL;

-- Create a unique constraint for invoice_number within each project
ALTER TABLE invoices
ADD CONSTRAINT unique_invoice_number_per_project UNIQUE (project_id, invoice_number);

-- Add an index for better performance
CREATE INDEX idx_invoice_number ON invoices(invoice_number);