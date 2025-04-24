-- Function to extract domain from email
CREATE OR REPLACE FUNCTION get_email_domain(email text)
RETURNS text AS $$
BEGIN
  RETURN LOWER(split_part(email, '@', 2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop existing project policies
DROP POLICY IF EXISTS "Users can view owned projects" ON projects;
DROP POLICY IF EXISTS "Users can manage owned projects" ON projects;

-- Create new domain-based policies for projects
CREATE POLICY "Users can view domain projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    -- Allow access if user is the owner
    user_id = auth.uid()
    OR
    -- Allow access if both users are from reconenterprises.net
    (
      get_email_domain((SELECT email FROM auth.users WHERE id = auth.uid())) = 'reconenterprises.net'
      AND
      get_email_domain((SELECT email FROM auth.users WHERE id = projects.user_id)) = 'reconenterprises.net'
    )
  );

CREATE POLICY "Users can manage owned projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Update related policies for project resources

-- Contractors
DROP POLICY IF EXISTS "Users can manage their contractors" ON contractors;

CREATE POLICY "Users can manage contractors"
  ON contractors
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    (
      get_email_domain((SELECT email FROM auth.users WHERE id = auth.uid())) = 'reconenterprises.net'
      AND
      get_email_domain((SELECT email FROM auth.users WHERE id = contractors.user_id)) = 'reconenterprises.net'
    )
  );

-- Project Contractors
DROP POLICY IF EXISTS "Users can manage project contractors" ON project_contractors;

CREATE POLICY "Users can manage project contractors"
  ON project_contractors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id
      AND (
        user_id = auth.uid()
        OR
        (
          get_email_domain((SELECT email FROM auth.users WHERE id = auth.uid())) = 'reconenterprises.net'
          AND
          get_email_domain((SELECT email FROM auth.users WHERE id = projects.user_id)) = 'reconenterprises.net'
        )
      )
    )
  );

-- Change Orders
DROP POLICY IF EXISTS "Users can manage change orders through projects" ON change_orders;

CREATE POLICY "Users can manage change orders"
  ON change_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = change_orders.project_id
      AND (
        user_id = auth.uid()
        OR
        (
          get_email_domain((SELECT email FROM auth.users WHERE id = auth.uid())) = 'reconenterprises.net'
          AND
          get_email_domain((SELECT email FROM auth.users WHERE id = projects.user_id)) = 'reconenterprises.net'
        )
      )
    )
  );

-- Invoices
DROP POLICY IF EXISTS "Users can manage invoices through projects" ON invoices;

CREATE POLICY "Users can manage invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = invoices.project_id
      AND (
        user_id = auth.uid()
        OR
        (
          get_email_domain((SELECT email FROM auth.users WHERE id = auth.uid())) = 'reconenterprises.net'
          AND
          get_email_domain((SELECT email FROM auth.users WHERE id = projects.user_id)) = 'reconenterprises.net'
        )
      )
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email_domain ON auth.users((get_email_domain(email)));