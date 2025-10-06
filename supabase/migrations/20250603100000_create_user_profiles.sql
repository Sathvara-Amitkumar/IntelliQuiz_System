/*
# [Structural] Create Profiles Table and User Syncing
This migration sets up a `profiles` table to store public user data and adds a trigger to keep it synchronized with Supabase's private `auth.users` table.

## Query Description:
This script performs the following actions:
1.  **Creates a `profiles` table**: This table will store user-specific data that is safe to expose, such as role and temporary passwords. It is linked one-to-one with the `auth.users` table.
2.  **Creates a trigger function (`handle_new_user`)**: This function automatically creates a new profile for a user when they sign up.
3.  **Creates a trigger (`on_auth_user_created`)**: This trigger executes the `handle_new_user` function every time a new user is added to `auth.users`.
4.  **Enables Row Level Security (RLS)**: Secures the `profiles` table by default.
5.  **Creates RLS Policies**: Defines rules for who can access or modify the profiles data.
    - Admins can manage all user profiles.
    - Users can view their own profile.
6.  **Backfills Existing Users**: Ensures that any users who signed up before this migration will also have a profile record.

This setup is crucial for securely managing user data on the client-side. No existing data will be lost.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- **Tables Created**: `public.profiles`
- **Functions Created**: `public.handle_new_user`
- **Triggers Created**: `on_auth_user_created` on `auth.users`
- **RLS Policies Created**: "Admins can manage all profiles.", "Users can view their own profile."

## Security Implications:
- RLS Status: Enabled on `public.profiles`.
- Policy Changes: Yes, new policies are added to control access to profiles.
- Auth Requirements: Policies rely on the authenticated user's session and email.

## Performance Impact:
- Indexes: A primary key index is created on `profiles.id`.
- Triggers: Adds a minor, negligible overhead on new user creation.
- Estimated Impact: Low.
*/

-- 1. Create the profiles table to store public user data
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    last_sign_in_at TIMESTAMPTZ,
    temp_password TEXT,
    temp_password_generated_at TIMESTAMPTZ
);

COMMENT ON TABLE public.profiles IS 'Stores public-facing user data and roles.';

-- 2. Create a function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, last_sign_in_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    NEW.last_sign_in_at
  );
  RETURN NEW;
END;
$$;

-- 3. Create a trigger to execute the function after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Enable Row Level Security for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for secure data access
CREATE POLICY "Admins can manage all profiles."
ON public.profiles
FOR ALL
USING (
  auth.role() = 'authenticated' AND
  (SELECT auth.jwt()->>'email') = 'admin@intelliquiz.com'
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  (SELECT auth.jwt()->>'email') = 'admin@intelliquiz.com'
);

CREATE POLICY "Users can view their own profile."
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 6. Backfill profiles for any existing users
INSERT INTO public.profiles (id, email, created_at, last_sign_in_at)
SELECT id, email, created_at, last_sign_in_at FROM auth.users
ON CONFLICT (id) DO NOTHING;
