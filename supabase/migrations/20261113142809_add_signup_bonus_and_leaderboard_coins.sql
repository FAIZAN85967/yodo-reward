/*
# Add 500 coins signup bonus and show coins on leaderboard

## Plain-English summary
Every new player gets 500 free coins the moment their account is created. A welcome popup is
shown once after signup and is then dismissed through a trusted function. The weekly leaderboard
now also shows each player's coin balance.

## Changed tables
- `profiles`: new column `welcome_bonus_pending` (true only for accounts created after this change;
  set to false once the player taps the welcome popup button).

## Changed functions
- `handle_new_user()`: new accounts start with 500 coins and welcome_bonus_pending = true.
  Mobile numbers are unique on profiles, so a number can receive this bonus only once.
- `acknowledge_welcome_bonus()`: new. Clears the welcome popup flag for the signed-in player.
- `get_weekly_leaderboard()`: now also returns each player's coin balance.

## Security
- Players can read welcome_bonus_pending only through their own profile; they cannot write it directly.
- acknowledge_welcome_bonus() is callable by signed-in players only and only affects their own row.
- Coin balance is still changed only by trusted server code; the bonus is set inside the signup trigger.

## Notes
1. Accounts created before this change keep their current balance and receive no bonus.
2. The leaderboard function is dropped and recreated because its returned columns change.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_bonus_pending boolean NOT NULL DEFAULT false;

GRANT SELECT (welcome_bonus_pending) ON public.profiles TO authenticated;

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
  INSERT INTO public.profiles (id, name, mobile, coins, welcome_bonus_pending)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(btrim(NEW.raw_user_meta_data ->> 'name'), ''), 'Player'),
    NEW.raw_user_meta_data ->> 'mobile',
    500,
    true
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.acknowledge_welcome_bonus()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.profiles SET welcome_bonus_pending = false WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.acknowledge_welcome_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_welcome_bonus() TO authenticated;

DROP FUNCTION IF EXISTS public.get_weekly_leaderboard();

CREATE FUNCTION public.get_weekly_leaderboard()
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  user_name text,
  points bigint,
  coins integer,
  is_me boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH weekly AS (
    SELECT gr.user_id AS uid, SUM(gr.points)::bigint AS total, MIN(gr.created_at) AS first_at
    FROM public.game_results gr
    WHERE gr.created_at >= public.current_week_start()
    GROUP BY gr.user_id
  )
  SELECT ROW_NUMBER() OVER (ORDER BY w.total DESC, w.first_at ASC) AS rank,
         w.uid AS user_id,
         p.name AS user_name,
         w.total AS points,
         p.coins AS coins,
         (w.uid = auth.uid()) AS is_me
  FROM weekly w
  JOIN public.profiles p ON p.id = w.uid
  ORDER BY w.total DESC, w.first_at ASC
  LIMIT 50;
$$;

REVOKE EXECUTE ON FUNCTION public.get_weekly_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard() TO authenticated;
