/*
  # Add description field to contractors

  1. Changes
    - Add `description` text column to contractors table
*/

-- Add description column to contractors table
ALTER TABLE contractors
ADD COLUMN description text;