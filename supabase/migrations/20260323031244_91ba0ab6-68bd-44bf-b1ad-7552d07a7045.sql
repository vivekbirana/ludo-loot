-- Remove client-side UPDATE policy on game_states
-- All updates now go through server-side edge functions using service role
DROP POLICY IF EXISTS "Players can update game state" ON public.game_states;