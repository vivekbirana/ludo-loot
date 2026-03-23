
-- 1. Add is_bot column to room_players for proper bot detection
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

-- 2. Remove client INSERT on game_states (only server should create)
DROP POLICY IF EXISTS "Room creator can insert game state" ON public.game_states;

-- 3. Restrict game_rooms UPDATE to only status changes by room creator (not winner_id)
DROP POLICY IF EXISTS "Players can update room" ON public.game_rooms;

-- Create restrictive update policy: only status='in_progress' by creator when waiting
CREATE POLICY "Creator can start game" ON public.game_rooms
FOR UPDATE TO authenticated
USING (auth.uid() = created_by AND status = 'waiting')
WITH CHECK (auth.uid() = created_by AND status = 'in_progress');

-- 4. Remove client INSERT on match_records (server will handle)
DROP POLICY IF EXISTS "Players can insert match records for their games" ON public.match_records;
