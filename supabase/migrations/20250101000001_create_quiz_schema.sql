/*
# [Create Quiz Management Schema]
This migration sets up the necessary tables, policies, and storage for creating and managing AI-generated quizzes.

## Query Description: [This script establishes the core structure for the IntelliQuiz platform. It creates tables for quizzes, questions, and their options, ensuring data is properly linked. It also enables Row Level Security to protect user data, allowing admins to only manage their own content. Finally, it sets up a dedicated storage bucket for document uploads. This is a foundational step and is safe to run on a new or existing schema.]

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Tables Created: `quizzes`, `questions`, `options`
- Storage Buckets Created: `quiz_documents`
- RLS Policies Enabled: Yes, on all new tables.

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes, new policies are created to restrict data access to the content owner.
- Auth Requirements: Policies are based on the authenticated user's ID (`auth.uid()`).

## Performance Impact:
- Indexes: Primary keys and foreign keys are indexed by default.
- Triggers: None
- Estimated Impact: Low. This adds new tables and does not affect existing ones.
*/

-- 1. Create the 'quizzes' table
CREATE TABLE public.quizzes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NOT NULL DEFAULT auth.uid(),
    title text NOT NULL,
    num_questions integer,
    time_limit_minutes integer,
    randomized_question_order boolean DEFAULT false,
    randomized_option_order boolean DEFAULT false,
    plagiarism_detection boolean DEFAULT false,
    strict_time_limits boolean DEFAULT false,
    auto_submit_on_timeout boolean DEFAULT false,
    document_path text,
    CONSTRAINT quizzes_pkey PRIMARY KEY (id),
    CONSTRAINT quizzes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- 2. Create the 'questions' table
CREATE TABLE public.questions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    quiz_id uuid NOT NULL,
    question_text text NOT NULL,
    CONSTRAINT questions_pkey PRIMARY KEY (id),
    CONSTRAINT questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes (id) ON DELETE CASCADE
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 3. Create the 'options' table for multiple-choice answers
CREATE TABLE public.options (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    question_id uuid NOT NULL,
    option_text text NOT NULL,
    is_correct boolean NOT NULL DEFAULT false,
    CONSTRAINT options_pkey PRIMARY KEY (id),
    CONSTRAINT options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions (id) ON DELETE CASCADE
);
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for RLS
-- Quizzes policies
CREATE POLICY "Admins can manage their own quizzes."
ON public.quizzes FOR ALL
USING (auth.uid() = user_id);

-- Questions policies
CREATE POLICY "Admins can manage questions for their own quizzes."
ON public.questions FOR ALL
USING (auth.uid() = (SELECT user_id FROM public.quizzes WHERE id = quiz_id));

-- Options policies
CREATE POLICY "Admins can manage options for questions in their own quizzes."
ON public.options FOR ALL
USING (auth.uid() = (SELECT q.user_id FROM public.questions p JOIN public.quizzes q ON p.quiz_id = q.id WHERE p.id = question_id));

-- 5. Create Storage bucket for quiz documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('quiz_documents', 'quiz_documents', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- 6. Create Storage policies
CREATE POLICY "Admins can manage their own documents."
ON storage.objects FOR ALL
USING (bucket_id = 'quiz_documents' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'quiz_documents' AND auth.uid()::text = (storage.foldername(name))[1]);
