/*
# Create game points, weekly leaderboard and weekly prizes

## Plain-English summary
Every finished Ludo game gives the player 2 points, and a win adds 10 more. The leaderboard
ranks players by points earned in the current week (Monday to Sunday, Pakistan time), so it
resets automatically each week. Admins can see last week's top 3, and mark their prizes as sent
(300 Rs for 1st, 200 Rs for 2nd, 100 Rs for 3rd).

## New tables
- `game_results`: one row per point award (user_id, points, reason = play or win, created_at).
- `prize_payouts`: one row per paid weekly prize (week_start, user_id, place, amount_rs, paid_at).

## Functions
- `current_week_start()`: Monday 00:00 of the current week in Pakistan time.
- `record_ludo_result(won)`: awards play points and, if won, win points to the signed-in player.
- `get_weekly_leaderboard()`: top 50 players for this week with names and points.
- `prize_amount_for_place(place)`: 300 / 200 / 100 Rs.
- `admin_weekly_winners(week_start)`: admin-only top 3 for a week (defaults to last week).
- `admin_mark_prize_paid(week_start, user_id)`: admin-only; records the payout and notifies the winner.

## Security
- RLS enabled. Points and payouts are not readable or writable directly; only through functions.
- Leaderboard shows only names and points, never mobile numbers.
- Admin functions check admin status before running.

## Notes
1. A prize can be marked paid only once per winner per week.
*/

CREATE TABLE IF NOT EXISTS public.game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points integer NOT NULL CHECK (points > 0),
  reason text NOT NULL CHECK (reason IN ('play', 'win')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_results_week_idx ON public.game_results (created_at, user_id);

ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.prize_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start timestamptz NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  place integer NOT NULL CHECK (place BETWEEN 1 AND 3),
  amount_rs integer NOT NULL CHECK (amount_rs > 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, user_id),
  UNIQUE (week_start, place)
);

ALTER TABLE public.prize_payouts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_week_start()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT date_trunc('week', now() AT TIME ZONE 'Asia/Karachi') AT TIME ZONE 'Asia/Karachi';
$$;

REVOKE EXECUTE ON FUNCTION public.current_week_start() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.prize_amount_for_place(p_place integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_place WHEN 1 THEN 300 WHEN 2 THEN 200 WHEN 3 THEN 100 ELSE 0 END;
$$;

REVOKE EXECUTE ON FUNCTION public.prize_amount_for_place(integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_ludo_result(p_won boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.game_results (user_id, points, reason) VALUES (v_uid, 2, 'play');
  IF p_won THEN
    INSERT INTO public.game_results (user_id, points, reason) VALUES (v_uid, 10, 'win');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_ludo_result(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_ludo_result(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard()
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  user_name text,
  points bigint,
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
         (w.uid = auth.uid()) AS is_me
  FROM weekly w
  JOIN public.profiles p ON p.id = w.uid
  ORDER BY w.total DESC, w.first_at ASC
  LIMIT 50;
$$;

REVOKE EXECUTE ON FUNCTION public.get_weekly_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_weekly_winners(p_week_start timestamptz DEFAULT NULL)
RETURNS TABLE (
  week_start timestamptz,
  place integer,
  user_id uuid,
  user_name text,
  user_mobile text,
  points bigint,
  prize_rs integer,
  paid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_start timestamptz := COALESCE(p_week_start, public.current_week_start() - interval '7 days');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    WITH weekly AS (
      SELECT gr.user_id AS uid, SUM(gr.points)::bigint AS total, MIN(gr.created_at) AS first_at
      FROM public.game_results gr
      WHERE gr.created_at >= v_start AND gr.created_at < v_start + interval '7 days'
      GROUP BY gr.user_id
    ),
    ranked AS (
      SELECT w.uid, w.total, w.first_at,
             ROW_NUMBER() OVER (ORDER BY w.total DESC, w.first_at ASC) AS pos
      FROM weekly w
    )
    SELECT v_start,
           r.pos::integer,
           r.uid,
           p.name,
           p.mobile,
           r.total,
           public.prize_amount_for_place(r.pos::integer),
           (pp.id IS NOT NULL)
    FROM ranked r
    JOIN public.profiles p ON p.id = r.uid
    LEFT JOIN public.prize_payouts pp ON pp.week_start = v_start AND pp.user_id = r.uid
    WHERE r.pos <= 3
    ORDER BY r.pos;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_weekly_winners(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_weekly_winners(timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_prize_paid(p_week_start timestamptz, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_place integer;
  v_paid boolean;
  v_amount integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  SELECT aw.place, aw.paid INTO v_place, v_paid
  FROM public.admin_weekly_winners(p_week_start) aw
  WHERE aw.user_id = p_user_id;

  IF v_place IS NULL THEN
    RAISE EXCEPTION 'not_a_winner';
  END IF;
  IF v_paid THEN
    RAISE EXCEPTION 'prize_already_paid';
  END IF;

  v_amount := public.prize_amount_for_place(v_place);

  INSERT INTO public.prize_payouts (week_start, user_id, place, amount_rs)
  VALUES (p_week_start, p_user_id, v_place, v_amount);

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (
    p_user_id,
    'Weekly Inam Bhej Diya Gaya',
    'Mubarak Ho! Aap ko ' || v_amount::text || ' Rs ka inam (' || v_place::text || ' number) bhej diya gaya hai.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_mark_prize_paid(timestamptz, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_prize_paid(timestamptz, uuid) TO authenticated;
