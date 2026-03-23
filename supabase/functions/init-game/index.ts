import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TokenState {
  position: "home" | "path" | "home_column" | "finished";
  pathIndex: number;
}

function createInitialGameState(playerCount: number, colorOrder: number[]) {
  const tokens: TokenState[][] = Array.from({ length: playerCount }, () =>
    Array.from({ length: 4 }, () => ({ position: "home" as const, pathIndex: 0 }))
  );

  // Blue (colorOrder index 3) always starts — find which seat has blue
  let startingSeat = 0;
  const blueIdx = colorOrder.indexOf(3);
  if (blueIdx >= 0) startingSeat = blueIdx;

  return {
    tokens,
    colorOrder,
    currentTurn: startingSeat,
    diceValue: null,
    turnPhase: "rolling",
    consecutiveSixes: 0,
    winner: null,
    playerCount,
    skipCounts: Array(playerCount).fill(0),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authUser.id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { roomId } = await req.json();
    if (!roomId) {
      return new Response(JSON.stringify({ error: "roomId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify room exists, is waiting, and caller is creator
    const { data: room } = await supabaseAdmin
      .from("game_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (!room) {
      return new Response(JSON.stringify({ error: "Room not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (room.created_by !== userId) {
      return new Response(JSON.stringify({ error: "Only room creator can init game" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (room.status !== "waiting") {
      return new Response(JSON.stringify({ error: "Game already started" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if game state already exists
    const { data: existing } = await supabaseAdmin
      .from("game_states")
      .select("id")
      .eq("room_id", roomId)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: "Game state already exists" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get players
    const { data: players } = await supabaseAdmin
      .from("room_players")
      .select("user_id, color_index")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (!players || players.length < 2) {
      return new Response(JSON.stringify({ error: "Need at least 2 players" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const playerCount = players.length;
    const colorOrder = players.map((p, idx) => p.color_index ?? idx);
    const initial = createInitialGameState(playerCount, colorOrder);

    // Insert game state (using service role, bypasses RLS)
    const { error: insertError } = await supabaseAdmin.from("game_states").insert({
      room_id: roomId,
      current_turn: initial.currentTurn,
      turn_phase: initial.turnPhase,
      token_positions: initial as unknown as Record<string, unknown>,
      turn_start_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Failed to create game state:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create game state" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, state: initial }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("init-game error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
