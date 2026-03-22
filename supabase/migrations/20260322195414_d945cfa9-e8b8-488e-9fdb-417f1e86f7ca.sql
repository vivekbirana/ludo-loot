
-- Tighten game_states insert policy
DROP POLICY IF EXISTS "Authenticated can insert game state" ON public.game_states;
CREATE POLICY "Room creator can insert game state" ON public.game_states
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_rooms
      WHERE game_rooms.id = game_states.room_id
      AND game_rooms.created_by = auth.uid()
    )
  );
