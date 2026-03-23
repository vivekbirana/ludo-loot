
DROP POLICY "Authenticated users can insert match records" ON public.match_records;

CREATE POLICY "Players can insert match records for their games"
  ON public.match_records FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_players
      WHERE room_players.room_id = match_records.room_id
      AND room_players.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM game_rooms
      WHERE game_rooms.id = match_records.room_id
      AND game_rooms.created_by = auth.uid()
    )
  );
