-- Drop all dependent policies first
DROP POLICY IF EXISTS "Users can view domain projects" ON projects;
DROP POLICY IF EXISTS "Users can manage owned projects" ON projects;
DROP POLICY IF EXISTS "Users can manage contractors" ON contractors;
DROP POLICY IF EXISTS "Users can manage project contractors" ON project_contractors;
DROP POLICY IF EXISTS "Users can manage change orders" ON change_orders;
DROP POLICY IF EXISTS "Users can manage invoices" ON invoices;

-- Now we can safely drop the function and index
DROP INDEX IF EXISTS auth.idx_auth_users_email_domain;
DROP FUNCTION IF EXISTS get_email_domain(text);

-- Create a secure function to check domain access
CREATE OR REPLACE FUNCTION check_domain_access(project_user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  current_user_domain text;
  project_user_domain text;
BEGIN
  -- Get domains for both users
  SELECT LOWER(split_part(email, '@', 2))
  INTO current_user_domain
  FROM auth.users
  WHERE id = auth.uid();

  SELECT LOWER(split_part(email, '@', 2))
  INTO project_user_domain
  FROM auth.users
  WHERE id = project_user_id;

  -- Check if both users are from reconenterprises.net
  RETURN 
    current_user_domain = 'reconenterprises.net' 
    AND project_user_domain = 'reconenterprises.net';
END;
$$;

-- Create new policies using the new function
CREATE POLICY "Users can view and manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    check_domain_access(user_id)
  );

CREATE POLICY "Users can manage contractors"
  ON contractors
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    check_domain_access(user_id)
  );

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
        check_domain_access(user_id)
      )
    )
  );

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
        check_domain_access(user_id)
      )
    )
  );

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
        check_domain_access(user_id)
      )
    )
  );