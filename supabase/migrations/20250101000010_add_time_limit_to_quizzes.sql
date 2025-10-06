/*
# [Operation] Add Time Limit to Quizzes
Adds a `time_limit` column to the `quizzes` table to store the duration of a quiz in minutes.

## Query Description: [This operation modifies the `quizzes` table by adding a new integer column named `time_limit`. Existing quizzes will have a `NULL` value for this new column, which is safe. No data will be lost.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Table: public.quizzes
- Column Added: time_limit (INT)

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [No]
- Auth Requirements: [Admin role for modification]

## Performance Impact:
- Indexes: [None]
- Triggers: [None]
- Estimated Impact: [Negligible performance impact. The column is added with no default value, which is a fast operation.]
*/
ALTER TABLE public.quizzes
ADD COLUMN time_limit INT;
