import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { room_id, count } = await req.json();

    if (!room_id || !count || count < 1 || count > 3) {
      return new Response(
        JSON.stringify({ error: "Invalid request. Provide room_id and count (1-3)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify room exists and is waiting
    const { data: room, error: roomError } = await supabaseAdmin
      .from("game_rooms")
      .select("*")
      .eq("id", room_id)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: "Room not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (room.status !== "waiting") {
      return new Response(
        JSON.stringify({ error: "Room is not in waiting status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current players with their color selections
    const { data: existingPlayers } = await supabaseAdmin
      .from("room_players")
      .select("id, color_index")
      .eq("room_id", room_id);

    const currentCount = existingPlayers?.length || 0;
    const slotsAvailable = room.max_players - currentCount;
    const botsToAdd = Math.min(count, slotsAvailable);

    if (botsToAdd <= 0) {
      return new Response(
        JSON.stringify({ error: "Room is full" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find available colors (0=Red, 1=Green, 2=Yellow, 3=Blue)
    // Opposite pairs: Red(0)<->Yellow(2), Green(1)<->Blue(3)
    const OPPOSITE_MAP: Record<number, number> = { 0: 2, 2: 0, 1: 3, 3: 1 };
    const takenColors = (existingPlayers || [])
      .map((p: any) => p.color_index)
      .filter((c: any) => c != null);

    let availableColors: number[];
    if (room.max_players === 2 && takenColors.length === 1) {
      // In 2P mode, bot must take the opposite color
      availableColors = [OPPOSITE_MAP[takenColors[0]]];
    } else {
      availableColors = [0, 1, 2, 3].filter((c) => !takenColors.includes(c));
    }

    const botNames = ["Bot Alpha", "Bot Beta", "Bot Gamma"];
    const bots = [];

    for (let i = 0; i < botsToAdd; i++) {
      const botId = crypto.randomUUID();
      const botColor = availableColors[i] ?? i;

      const { error: insertError } = await supabaseAdmin
        .from("room_players")
        .insert({
          room_id,
          user_id: botId,
          is_ready: true,
          color_index: botColor,
        });

      if (insertError) {
        console.error("Failed to add bot:", insertError);
        continue;
      }

      bots.push({ user_id: botId, name: botNames[i] || `Bot ${i + 1}` });
    }

    return new Response(
      JSON.stringify({ success: true, bots_added: bots.length, bots }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in add-bots:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
