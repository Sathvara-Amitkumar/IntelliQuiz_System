/*
  # Create User Quiz Attempts and Enhanced Profiles

  1. New Tables
    - `quiz_attempts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `quiz_id` (uuid, references quizzes)
      - `score` (integer, total score achieved)
      - `total_questions` (integer, total questions in quiz)
      - `percentage` (numeric, calculated percentage score)
      - `started_at` (timestamptz, when quiz started)
      - `completed_at` (timestamptz, when quiz completed)
      - `time_taken_seconds` (integer, time taken to complete)
      - `status` (text, 'in_progress' or 'completed')

    - `user_answers`
      - `id` (uuid, primary key)
      - `attempt_id` (uuid, references quiz_attempts)
      - `question_id` (uuid, references questions)
      - `selected_option_id` (uuid, references options)
      - `is_correct` (boolean)
      - `answered_at` (timestamptz)

  2. Table Modifications
    - `quizzes` table: Add `quiz_password` and `is_published` columns

  3. Security
    - Enable RLS on all new tables
    - Users can only view their own quiz attempts
    - Users can only view quizzes that are published
    - Users can create attempts for published quizzes
    - Admins can view all attempts for their quizzes

  4. Indexes
    - Index on user_id for faster queries
    - Index on quiz_id for faster queries
    - Index on attempt_id for user_answers
*/

-- Add quiz password and published status to quizzes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'quiz_password'
  ) THEN
    ALTER TABLE public.quizzes ADD COLUMN quiz_password text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE public.quizzes ADD COLUMN is_published boolean DEFAULT false;
  END IF;
END $$;

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  total_questions integer NOT NULL,
  percentage numeric(5,2) DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  time_taken_seconds integer,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create user_answers table
CREATE TABLE IF NOT EXISTS public.user_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES public.options(id) ON DELETE SET NULL,
  is_correct boolean DEFAULT false,
  answered_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON public.quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_user_answers_attempt_id ON public.user_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON public.user_answers(question_id);

-- RLS Policies for quiz_attempts

-- Users can view their own quiz attempts
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view own quiz attempts"
  ON public.quiz_attempts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create quiz attempts for published quizzes
DROP POLICY IF EXISTS "Users can create quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can create quiz attempts"
  ON public.quiz_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE id = quiz_id AND is_published = true
    )
  );

-- Users can update their own in-progress attempts
DROP POLICY IF EXISTS "Users can update own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can update own attempts"
  ON public.quiz_attempts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Quiz creators can view all attempts for their quizzes
DROP POLICY IF EXISTS "Quiz creators can view attempts" ON public.quiz_attempts;
CREATE POLICY "Quiz creators can view attempts"
  ON public.quiz_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE id = quiz_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for user_answers

-- Users can view their own answers
DROP POLICY IF EXISTS "Users can view own answers" ON public.user_answers;
CREATE POLICY "Users can view own answers"
  ON public.user_answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts
      WHERE id = attempt_id AND user_id = auth.uid()
    )
  );

-- Users can create answers for their own attempts
DROP POLICY IF EXISTS "Users can create answers" ON public.user_answers;
CREATE POLICY "Users can create answers"
  ON public.user_answers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts
      WHERE id = attempt_id AND user_id = auth.uid()
    )
  );

-- Quiz creators can view answers for their quizzes
DROP POLICY IF EXISTS "Quiz creators can view answers" ON public.user_answers;
CREATE POLICY "Quiz creators can view answers"
  ON public.user_answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      WHERE qa.id = attempt_id AND q.user_id = auth.uid()
    )
  );

-- Update quizzes policies to allow users to view published quizzes
DROP POLICY IF EXISTS "Users can view published quizzes" ON public.quizzes;
CREATE POLICY "Users can view published quizzes"
  ON public.quizzes
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Update questions policies to allow users to view questions for published quizzes
DROP POLICY IF EXISTS "Users can view questions for published quizzes" ON public.questions;
CREATE POLICY "Users can view questions for published quizzes"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE id = quiz_id AND is_published = true
    )
  );

-- Update options policies to allow users to view options for published quizzes
DROP POLICY IF EXISTS "Users can view options for published quizzes" ON public.options;
CREATE POLICY "Users can view options for published quizzes"
  ON public.options
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.quizzes qz ON q.quiz_id = qz.id
      WHERE q.id = question_id AND qz.is_published = true
    )
  );
