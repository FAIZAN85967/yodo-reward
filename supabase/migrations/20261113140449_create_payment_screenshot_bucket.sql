/*
# Create private bucket for payment screenshots

## Plain-English summary
Players upload their payment screenshot into a private storage bucket. Each player's files
go in a folder named after their own account ID. Only that player and admins can view them.

## Security
- Bucket is private (no public URLs).
- Players can upload only into their own folder.
- Players can view only their own screenshots; admins can view all of them.

## Notes
1. Screenshots are shown to admins through short-lived signed links.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "upload_own_payment_screenshots" ON storage.objects;
CREATE POLICY "upload_own_payment_screenshots" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "read_own_payment_screenshots" ON storage.objects;
CREATE POLICY "read_own_payment_screenshots" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-screenshots'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );
