/*
# Create profiles and admin settings

## Plain-English summary
Each signed-up player gets a profile (name, mobile number, coin balance). The admin
payment numbers (JazzCash and Easypaisa) are stored in a single settings row that only
the admin can change.

## New tables
- `profiles`: id (matches the login account), name, mobile (unique, 11 digits starting 03),
  coins (balance, never negative), is_admin (admin flag, hidden from players), created_at.
- `admin_settings`: single row (id = 1) with jazzcash_number, easypaisa_number, updated_at.

## Functions
- `handle_new_user()`: trigger that creates a profile when a player signs up.
- `is_admin()`: returns true when the signed-in account is an admin.
- `mobile_taken(text)`: lets the signup form check whether a mobile number is already registered.

## Security
- RLS enabled on both tables.
- Players can read only their own profile, and only safe columns (is_admin is never exposed).
- Players can change only their name. Coin balance changes only through trusted server functions.
- Only admins can update the payment numbers.

## Notes
1. Admin accounts are created separately and get is_admin = true.
2. Trigger functions are not callable by app users.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  mobile text NOT NULL UNIQUE CHECK (mobile ~ '^03[0-9]{9}$'),
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT (id, name, mobile, coins, created_at) ON public.profiles TO authenticated;
GRANT UPDATE (name) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile_name" ON public.profiles;
CREATE POLICY "update_own_profile_name" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.raw_user_meta_data ->> 'mobile' IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.profiles (id, name, mobile)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(btrim(NEW.raw_user_meta_data ->> 'name'), ''), 'Player'),
    NEW.raw_user_meta_data ->> 'mobile'
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.mobile_taken(p_mobile text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.mobile = p_mobile);
$$;

REVOKE EXECUTE ON FUNCTION public.mobile_taken(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mobile_taken(text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  jazzcash_number text NOT NULL DEFAULT '',
  easypaisa_number text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.admin_settings TO authenticated;
GRANT UPDATE (jazzcash_number, easypaisa_number, updated_at) ON public.admin_settings TO authenticated;

-- Payment numbers are shared with every signed-in player by design.
DROP POLICY IF EXISTS "select_admin_settings" ON public.admin_settings;
CREATE POLICY "select_admin_settings" ON public.admin_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_admin_settings" ON public.admin_settings;
CREATE POLICY "update_admin_settings" ON public.admin_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
