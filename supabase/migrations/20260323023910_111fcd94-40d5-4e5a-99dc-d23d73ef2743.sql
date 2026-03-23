
CREATE TABLE public.match_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  room_code TEXT NOT NULL,
  bet_amount INTEGER NOT NULL DEFAULT 0,
  player_count INTEGER NOT NULL DEFAULT 2,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  winner_seat INTEGER,
  winner_user_id UUID,
  final_state JSONB,
  move_log JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_seconds INTEGER,
  finish_reason TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.match_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view match records"
  ON public.match_records FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert match records"
  ON public.match_records FOR INSERT TO authenticated
  WITH CHECK (true);
