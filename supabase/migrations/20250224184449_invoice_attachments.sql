-- Create storage bucket for invoice attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice_attachments', 'invoice_attachments', false);

-- Set up storage permissions for authenticated users
CREATE POLICY "Users can upload invoice files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoice_attachments');

CREATE POLICY "Users can read their invoice files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'invoice_attachments');

CREATE POLICY "Users can update their invoice files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'invoice_attachments');

CREATE POLICY "Users can delete their invoice files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'invoice_attachments');

-- Add file_url field to invoices table
ALTER TABLE invoices
ADD COLUMN file_url TEXT DEFAULT NULL; 