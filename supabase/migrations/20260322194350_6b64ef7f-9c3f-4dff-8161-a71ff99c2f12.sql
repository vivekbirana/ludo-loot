
-- Game rooms table
CREATE TABLE public.game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  bet_amount integer NOT NULL,
  max_players integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'waiting',
  created_by uuid NOT NULL,
  winner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Room players table
CREATE TABLE public.room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  is_ready boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- RLS for game_rooms
CREATE POLICY "Anyone can view waiting rooms" ON public.game_rooms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create rooms" ON public.game_rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update room" ON public.game_rooms
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- RLS for room_players
CREATE POLICY "Anyone can view room players" ON public.room_players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can join rooms" ON public.room_players
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can update own readiness" ON public.room_players
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Players can leave rooms" ON public.room_players
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;

-- Updated_at trigger for game_rooms
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
