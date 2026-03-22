
-- Game states table for tracking active game state
CREATE TABLE public.game_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_turn integer NOT NULL DEFAULT 0,
  dice_value integer,
  turn_phase text NOT NULL DEFAULT 'rolling',
  token_positions jsonb NOT NULL DEFAULT '{}',
  turn_start_at timestamptz,
  winner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view game states (for spectating)
CREATE POLICY "Anyone can view game states" ON public.game_states
  FOR SELECT TO authenticated USING (true);

-- Players in the room can update game state
CREATE POLICY "Players can update game state" ON public.game_states
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.room_players
      WHERE room_players.room_id = game_states.room_id
      AND room_players.user_id = auth.uid()
    )
  );

-- Allow insert for game creation
CREATE POLICY "Authenticated can insert game state" ON public.game_states
  FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_states;

-- Updated_at trigger
CREATE TRIGGER update_game_states_updated_at
  BEFORE UPDATE ON public.game_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Also allow room creator OR any player to update room status (for starting game)
DROP POLICY IF EXISTS "Creator can update room" ON public.game_rooms;
CREATE POLICY "Players can update room" ON public.game_rooms
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.room_players
      WHERE room_players.room_id = game_rooms.id
      AND room_players.user_id = auth.uid()
    )
    OR auth.uid() = created_by
  );
