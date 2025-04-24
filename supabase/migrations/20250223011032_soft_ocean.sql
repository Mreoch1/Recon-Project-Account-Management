/*
  # Add automatic invoice status updates
  
  1. Changes
    - Add trigger to automatically update invoice status to 'overdue' when due date passes
    - Add trigger to update invoice status to 'pending' when due date is updated to a future date
    - Add function to update all invoice statuses
  
  2. Security
    - Functions run with security definer to ensure they have necessary permissions
*/

-- Create function to update invoice status
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Set status to 'overdue' if due date has passed and invoice isn't paid
  IF NEW.due_date < CURRENT_DATE AND NEW.status = 'pending' THEN
    NEW.status := 'overdue';
  -- Reset to 'pending' if due date is in future and invoice was overdue
  ELSIF NEW.due_date > CURRENT_DATE AND NEW.status = 'overdue' THEN
    NEW.status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update status on insert or update
DROP TRIGGER IF EXISTS check_invoice_status ON invoices;
CREATE TRIGGER check_invoice_status
  BEFORE INSERT OR UPDATE OF due_date, status
  ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

-- Create function to update all invoice statuses
CREATE OR REPLACE FUNCTION update_all_invoice_statuses()
RETURNS void AS $$
BEGIN
  -- Update pending invoices to overdue if due date has passed
  UPDATE invoices
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
    
  -- Update overdue invoices to pending if due date is in future
  UPDATE invoices
  SET status = 'pending'
  WHERE status = 'overdue'
    AND due_date > CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;