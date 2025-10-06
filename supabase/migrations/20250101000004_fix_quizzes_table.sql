/*
# [Fix] Add `created_by` Column and Re-assert RLS
This migration ensures the 'quizzes' table has a 'created_by' column linked to the user who created the quiz. It is essential for ownership and security.

## Query Description:
This operation adds a 'created_by' column to the 'quizzes' table if it doesn't already exist. It links this column to the 'auth.users' table to track quiz ownership. It also re-applies the Row Level Security (RLS) policy to ensure admins can only see and manage their own quizzes. This is a non-destructive operation.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Table: public.quizzes
- Columns Added: created_by (UUID)
- Constraints Added: Foreign key from 'quizzes.created_by' to 'auth.users.id'
- Policies Modified: Re-applies the 'Admins can manage their own quizzes' policy.

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes (re-assertion of existing policy)
- Auth Requirements: This column links quizzes to authenticated users.

## Performance Impact:
- Indexes: A foreign key index will be implicitly created.
- Triggers: None
- Estimated Impact: Negligible performance impact.
*/

-- Add the 'created_by' column to the 'quizzes' table if it does not exist.
-- This column will store the ID of the user who created the quiz.
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS created_by uuid NOT NULL DEFAULT auth.uid();

-- Add a foreign key constraint to link 'created_by' to the 'auth.users' table.
-- We must first drop the constraint if it exists to avoid errors on re-run.
ALTER TABLE public.quizzes
DROP CONSTRAINT IF EXISTS quizzes_created_by_fkey;

ALTER TABLE public.quizzes
ADD CONSTRAINT quizzes_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure Row Level Security is enabled on the table.
ALTER TABLE public.quizzes
ENABLE ROW LEVEL SECURITY;

-- Re-create the policy to ensure admins can only manage their own quizzes.
-- Dropping and re-creating makes this script safely re-runnable.
DROP POLICY IF EXISTS "Admins can manage their own quizzes." ON public.quizzes;
CREATE POLICY "Admins can manage their own quizzes."
ON public.quizzes
FOR ALL
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);
