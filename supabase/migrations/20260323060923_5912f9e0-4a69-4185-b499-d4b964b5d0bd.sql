CREATE POLICY "Players can insert game states"
ON public.game_states FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_players.room_id = game_states.room_id
      AND room_players.user_id = auth.uid()
  )
);

CREATE POLICY "Players can update game states"
ON public.game_states FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_players.room_id = game_states.room_id
      AND room_players.user_id = auth.uid()
  )
);