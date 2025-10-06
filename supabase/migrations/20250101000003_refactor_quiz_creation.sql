/*
# [Refactor Quiz Creation Schema]
This migration refactors the `quizzes` table to align with the new quiz creation workflow. It removes the description and password fields and adds a field for the number of questions.

## Query Description: [This operation will modify the `quizzes` table by dropping the `description`, `password`, and `password_protected` columns. It will then add a new `total_questions` column. Any existing data in the dropped columns will be permanently lost. A backup is highly recommended before applying this migration.]

## Metadata:
- Schema-Category: ["Dangerous", "Structural"]
- Impact-Level: ["High"]
- Requires-Backup: [true]
- Reversible: [false]

## Structure Details:
- Table `quizzes`:
  - DROP COLUMN `description`
  - DROP COLUMN `password`
  - DROP COLUMN `password_protected`
  - ADD COLUMN `total_questions` integer

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [No]
- Auth Requirements: [Admin]

## Performance Impact:
- Indexes: [None]
- Triggers: [None]
- Estimated Impact: [Low, but will lock the table briefly during the ALTER operation.]
*/

-- Drop the obsolete columns from the quizzes table
ALTER TABLE public.quizzes
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS password,
DROP COLUMN IF EXISTS password_protected;

-- Add the new total_questions column
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS total_questions INTEGER;
