-- Public reviews wall for Prafund.
-- Anyone (signed-in or not) can read all reviews and post a new one.
-- Authenticated users may delete their own review. Nobody can edit or delete
-- someone else's review, and anon-inserted reviews are not editable at all.

CREATE TABLE public.reviews (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL CHECK (char_length(body) <= 500),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reviews_created_at_idx ON public.reviews (created_at DESC);

GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Anyone can post a review"
  ON public.reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Signed-in users can delete their own review"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable the realtime stream for the reviews table (a `supabase.realtime`
-- channel on it powers the "new reviews appear without reloading" behaviour).
ALTER TABLE public.reviews REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
