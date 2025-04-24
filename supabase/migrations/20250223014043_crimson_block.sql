/*
  # Update invoice numbering system

  1. Changes
    - Remove auto-generation of invoice numbers
    - Keep invoice numbers unique per project
    - Remove unused functions and triggers

  2. Notes
    - Users can now enter their own invoice numbers
    - Numbers must still be unique within each project
*/

-- Drop the auto-generation function and trigger
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
DROP FUNCTION IF EXISTS generate_invoice_number();
DROP SEQUENCE IF EXISTS invoice_number_seq;