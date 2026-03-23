
-- Allow players to update game_rooms status (for finishing games)
CREATE POLICY "Players can update their game rooms"
ON public.game_rooms FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_players.room_id = game_rooms.id
      AND room_players.user_id = auth.uid()
  )
);

-- Allow players to insert match records
CREATE POLICY "Players can insert match records"
ON public.match_records FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_players.room_id = match_records.room_id
      AND room_players.user_id = auth.uid()
  )
);

-- Allow authenticated users to read match records
CREATE POLICY "Authenticated users can read match records"
ON public.match_records FOR SELECT
TO authenticated
USING (true);
