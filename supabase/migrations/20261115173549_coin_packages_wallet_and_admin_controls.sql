/*
# Coin packages, wallet history, user blocking and admin dashboard functions

## Plain-English summary
Players now buy coins from fixed packages (100 Rs = 1000 Coins up to 1000 Rs = 10000 Coins).
Admins can edit these packages and the JazzCash / Easypaisa numbers, plus an account title.
Every coin credit (signup bonus and approved purchase) is recorded in a wallet ledger so players
can see their history. Admins get dashboard totals, a searchable user list, and can block users.

## New tables
- `coin_packages`: id, rupees (price), coins (amount given), is_active (shown to players or hidden).
  Five starting packages are seeded with fixed ids.
- `coin_transactions`: wallet ledger. One row per coin credit: user_id, kind ('bonus' or 'purchase'),
  coins, request_id (for purchases), created_at. Players can read only their own rows.

## Changed tables
- `profiles`: new column `is_blocked` (default false). Players can read it; only admins can change it.
- `admin_settings`: new column `account_title`, editable by admins.
- `coin_requests`: the fixed "1000 minimum, steps of 100" rule is removed, because packages
  define the amounts now. Coins must simply be greater than zero.

## Changed functions
- `submit_coin_request(package_id, transaction_id, screenshot_path)`: replaces the old version that
  took a coin amount. The price and coins are read from the chosen active package on the server.
  Blocked accounts cannot submit requests.
- `admin_review_coin_request`: approving also writes a 'purchase' row to the wallet ledger.
- `handle_new_user`: signup bonus of 500 coins is also written to the wallet ledger.
- `record_ludo_result`: blocked accounts do not earn points.

## New admin functions (admin accounts only)
- `admin_dashboard_stats()`: total players, total coins given, pending requests, total revenue (Rs).
- `admin_list_users(search)`: players with name, mobile, coins, total coins bought, total paid, join date, blocked status.
- `admin_set_user_blocked(user_id, blocked)`: blocks or unblocks a player. Admins cannot block themselves.
- `admin_save_coin_package(id, rupees, coins, is_active)`: edits a package.

## Security
- RLS enabled on new tables; players read only their own wallet rows and only active packages.
- All admin writes go through functions that check `is_admin()`.
- Players cannot change their own block status, coin balance, or package prices.

## Notes
1. Wallet history for signups before this change is backfilled with the 500 coin bonus for accounts
   created on or after the bonus was introduced.
2. Each approved request is recorded in the ledger at most once.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;
GRANT SELECT (is_blocked) ON public.profiles TO authenticated;

ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS account_title text NOT NULL DEFAULT '';
GRANT UPDATE (account_title) ON public.admin_settings TO authenticated;

CREATE TABLE IF NOT EXISTS public.coin_packages (
  id integer PRIMARY KEY,
  rupees integer NOT NULL CHECK (rupees > 0),
  coins integer NOT NULL CHECK (coins > 0),
  is_active boolean NOT NULL DEFAULT true
);

INSERT INTO public.coin_packages (id, rupees, coins) VALUES
  (1, 100, 1000),
  (2, 200, 2000),
  (3, 300, 3000),
  (4, 500, 5000),
  (5, 1000, 10000)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.coin_packages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.coin_packages TO authenticated;

DROP POLICY IF EXISTS "select_active_coin_packages" ON public.coin_packages;
CREATE POLICY "select_active_coin_packages" ON public.coin_packages FOR SELECT
  TO authenticated USING (is_active OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('bonus', 'purchase')),
  coins integer NOT NULL CHECK (coins > 0),
  request_id uuid REFERENCES public.coin_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coin_transactions_user_idx ON public.coin_transactions (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS coin_transactions_request_unique
  ON public.coin_transactions (request_id) WHERE request_id IS NOT NULL;

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.coin_transactions TO authenticated;

DROP POLICY IF EXISTS "select_own_coin_transactions" ON public.coin_transactions;
CREATE POLICY "select_own_coin_transactions" ON public.coin_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.coin_transactions (user_id, kind, coins, created_at)
SELECT p.id, 'bonus', 500, p.created_at
FROM public.profiles p
WHERE p.created_at >= '2026-11-13 14:28:00+00'
  AND NOT EXISTS (
    SELECT 1 FROM public.coin_transactions ct WHERE ct.user_id = p.id AND ct.kind = 'bonus'
  );

ALTER TABLE public.coin_requests DROP CONSTRAINT IF EXISTS coin_requests_coins_check;
ALTER TABLE public.coin_requests ADD CONSTRAINT coin_requests_coins_check CHECK (coins > 0);

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
  INSERT INTO public.coin_transactions (user_id, kind, coins)
  VALUES (NEW.id, 'bonus', 500);
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.submit_coin_request(integer, text, text);

CREATE FUNCTION public.submit_coin_request(p_package_id integer, p_transaction_id text, p_screenshot_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_txn text := btrim(p_transaction_id);
  v_pkg public.coin_packages%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.is_blocked) THEN
    RAISE EXCEPTION 'account_blocked' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pkg FROM public.coin_packages cp WHERE cp.id = p_package_id AND cp.is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_package';
  END IF;

  IF char_length(v_txn) < 4 OR char_length(v_txn) > 40 THEN
    RAISE EXCEPTION 'invalid_transaction_id';
  END IF;
  IF p_screenshot_path IS NULL
     OR left(p_screenshot_path, char_length(v_uid::text) + 1) <> v_uid::text || '/' THEN
    RAISE EXCEPTION 'invalid_screenshot';
  END IF;

  INSERT INTO public.coin_requests (user_id, coins, amount_rs, transaction_id, screenshot_path)
  VALUES (v_uid, v_pkg.coins, v_pkg.rupees, v_txn, p_screenshot_path)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_coin_request(integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_coin_request(integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_coin_request(p_request_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_req public.coin_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req FROM public.coin_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'request_already_reviewed';
  END IF;

  UPDATE public.coin_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      reviewed_at = now()
  WHERE id = v_req.id;

  IF p_approve THEN
    UPDATE public.profiles SET coins = coins + v_req.coins WHERE id = v_req.user_id;
    INSERT INTO public.coin_transactions (user_id, kind, coins, request_id)
    VALUES (v_req.user_id, 'purchase', v_req.coins, v_req.id);
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (
      v_req.user_id,
      'Mubarak Ho! Aap Ke Coins Mil Gaye',
      v_req.coins::text || ' Coins aap ke account mein add ho gaye hain.'
    );
  ELSE
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (
      v_req.user_id,
      'Coin Request Reject Ho Gayi',
      v_req.coins::text || ' Coins wali request reject ho gayi. Mazeed maloomat ke liye admin se rabta karein.'
    );
  END IF;
END;
$$;

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
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.is_blocked) THEN
    RAISE EXCEPTION 'account_blocked' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.game_results (user_id, points, reason) VALUES (v_uid, 2, 'play');
  IF p_won THEN
    INSERT INTO public.game_results (user_id, points, reason) VALUES (v_uid, 10, 'win');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS TABLE (
  total_users bigint,
  total_coins_given bigint,
  pending_requests bigint,
  total_revenue_rs bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT
      (SELECT count(*) FROM public.profiles p WHERE NOT p.is_admin),
      (SELECT COALESCE(sum(ct.coins), 0) FROM public.coin_transactions ct),
      (SELECT count(*) FROM public.coin_requests cr WHERE cr.status = 'pending'),
      (SELECT COALESCE(sum(cr.amount_rs), 0) FROM public.coin_requests cr WHERE cr.status = 'approved');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text DEFAULT '')
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_mobile text,
  coins integer,
  total_bought_coins bigint,
  total_paid_rs bigint,
  joined_at timestamptz,
  is_blocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_term text := btrim(COALESCE(p_search, ''));
  v_pattern text := '%' || btrim(COALESCE(p_search, '')) || '%';
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT p.id,
           p.name,
           p.mobile,
           p.coins,
           COALESCE(b.coins_total, 0)::bigint,
           COALESCE(b.paid_total, 0)::bigint,
           p.created_at,
           p.is_blocked
    FROM public.profiles p
    LEFT JOIN (
      SELECT cr.user_id AS uid, sum(cr.coins) AS coins_total, sum(cr.amount_rs) AS paid_total
      FROM public.coin_requests cr
      WHERE cr.status = 'approved'
      GROUP BY cr.user_id
    ) b ON b.uid = p.id
    WHERE NOT p.is_admin
      AND (v_term = '' OR p.name ILIKE v_pattern OR p.mobile ILIKE v_pattern)
    ORDER BY p.created_at DESC
    LIMIT 500;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(p_user_id uuid, p_blocked boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_block_self';
  END IF;

  UPDATE public.profiles SET is_blocked = p_blocked WHERE id = p_user_id AND NOT is_admin;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_save_coin_package(p_id integer, p_rupees integer, p_coins integer, p_is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  IF p_rupees IS NULL OR p_rupees <= 0 OR p_coins IS NULL OR p_coins <= 0 THEN
    RAISE EXCEPTION 'invalid_package_values';
  END IF;

  UPDATE public.coin_packages
  SET rupees = p_rupees, coins = p_coins, is_active = p_is_active
  WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'package_not_found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_save_coin_package(integer, integer, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_coin_package(integer, integer, integer, boolean) TO authenticated;
