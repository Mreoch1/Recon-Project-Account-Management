-- Create storage bucket for invoice attachments
-- Only create if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'invoice_attachments') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('invoice_attachments', 'invoice_attachments', false);
  END IF;
END
$$;

-- Set up storage permissions for authenticated users
DROP POLICY IF EXISTS "Users can upload invoice files" ON storage.objects;
CREATE POLICY "Users can upload invoice files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoice_attachments');

DROP POLICY IF EXISTS "Users can read their invoice files" ON storage.objects;
CREATE POLICY "Users can read their invoice files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'invoice_attachments');

DROP POLICY IF EXISTS "Users can update their invoice files" ON storage.objects;
CREATE POLICY "Users can update their invoice files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'invoice_attachments');

DROP POLICY IF EXISTS "Users can delete their invoice files" ON storage.objects;
CREATE POLICY "Users can delete their invoice files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'invoice_attachments');

-- Add file_url field to invoices table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'invoices' 
    AND column_name = 'file_url'
  ) THEN
    ALTER TABLE invoices
    ADD COLUMN file_url TEXT DEFAULT NULL;
  END IF;
END
$$; 