/*
# Create coin purchase requests and in-app notifications

## Plain-English summary
Players submit a coin purchase request with the transaction ID and a payment screenshot.
Admins approve or reject it. Approving adds the coins to the player's balance and sends
them a notification. Each request also sends the admin a notice.

## New tables
- `coin_requests`: id, user_id, coins (min 1000, steps of 100), amount_rs (coins / 10),
  transaction_id (unique, case-insensitive), screenshot_path, status (pending / approved /
  rejected), created_at, reviewed_at.
- `notifications`: id, user_id, title, body, is_read, created_at.

## Functions
- `submit_coin_request(coins, transaction_id, screenshot_path)`: validates and creates a request.
- `admin_list_coin_requests(status)`: admin-only list with player name and mobile.
- `admin_review_coin_request(request_id, approve)`: admin-only approve or reject. Approve adds coins
  and notifies the player.

## Security
- RLS enabled. Players can read only their own requests and notifications.
- Players can mark their own notifications as read, nothing else.
- All writes go through functions that check the caller's identity or admin status.
- A transaction ID can be used only once.

## Notes
1. Screenshot paths must start with the player's own user ID folder.
*/

CREATE TABLE IF NOT EXISTS public.coin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  coins integer NOT NULL CHECK (coins >= 1000 AND coins % 100 = 0),
  amount_rs integer NOT NULL CHECK (amount_rs > 0),
  transaction_id text NOT NULL CHECK (char_length(transaction_id) BETWEEN 4 AND 40),
  screenshot_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS coin_requests_transaction_unique ON public.coin_requests (lower(transaction_id));
CREATE INDEX IF NOT EXISTS coin_requests_user_idx ON public.coin_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS coin_requests_status_idx ON public.coin_requests (status, created_at DESC);

ALTER TABLE public.coin_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.coin_requests TO authenticated;

DROP POLICY IF EXISTS "select_own_coin_requests" ON public.coin_requests;
CREATE POLICY "select_own_coin_requests" ON public.coin_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE (is_read) ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications" ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.submit_coin_request(p_coins integer, p_transaction_id text, p_screenshot_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_txn text := btrim(p_transaction_id);
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_coins IS NULL OR p_coins < 1000 OR p_coins % 100 <> 0 THEN
    RAISE EXCEPTION 'invalid_coins';
  END IF;
  IF char_length(v_txn) < 4 OR char_length(v_txn) > 40 THEN
    RAISE EXCEPTION 'invalid_transaction_id';
  END IF;
  IF p_screenshot_path IS NULL
     OR left(p_screenshot_path, char_length(v_uid::text) + 1) <> v_uid::text || '/' THEN
    RAISE EXCEPTION 'invalid_screenshot';
  END IF;

  INSERT INTO public.coin_requests (user_id, coins, amount_rs, transaction_id, screenshot_path)
  VALUES (v_uid, p_coins, p_coins / 10, v_txn, p_screenshot_path)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_coin_request(integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_coin_request(integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_coin_requests(p_status text DEFAULT 'pending')
RETURNS TABLE (
  request_id uuid,
  user_name text,
  user_mobile text,
  coins integer,
  amount_rs integer,
  transaction_id text,
  screenshot_path text,
  status text,
  created_at timestamptz
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
    SELECT cr.id, p.name, p.mobile, cr.coins, cr.amount_rs, cr.transaction_id,
           cr.screenshot_path, cr.status, cr.created_at
    FROM public.coin_requests cr
    JOIN public.profiles p ON p.id = cr.user_id
    WHERE p_status = 'all' OR cr.status = p_status
    ORDER BY cr.created_at DESC
    LIMIT 200;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_coin_requests(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_coin_requests(text) TO authenticated;

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

REVOKE EXECUTE ON FUNCTION public.admin_review_coin_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_coin_request(uuid, boolean) TO authenticated;
