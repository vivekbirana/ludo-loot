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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find waiting rooms older than 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: staleRooms, error: roomsError } = await supabaseAdmin
      .from("game_rooms")
      .select("id, created_by, bet_amount")
      .eq("status", "waiting")
      .lt("created_at", fiveMinAgo);

    if (roomsError) {
      console.error("Error fetching stale rooms:", roomsError);
      return new Response(
        JSON.stringify({ error: roomsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!staleRooms || staleRooms.length === 0) {
      return new Response(
        JSON.stringify({ message: "No stale rooms found", closed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let closedCount = 0;

    for (const room of staleRooms) {
      // Get players in this room
      const { data: players } = await supabaseAdmin
        .from("room_players")
        .select("user_id")
        .eq("room_id", room.id);

      const playerCount = players?.length || 0;

      // Only auto-close if 0 or 1 player (creator alone)
      if (playerCount > 1) continue;

      // Refund the creator
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("balance")
        .eq("user_id", room.created_by)
        .single();

      if (wallet) {
        await supabaseAdmin
          .from("wallets")
          .update({ balance: wallet.balance + room.bet_amount })
          .eq("user_id", room.created_by);

        await supabaseAdmin
          .from("transactions")
          .insert({
            user_id: room.created_by,
            type: "credit",
            amount: room.bet_amount,
            description: "Room auto-closed — bet refunded",
          });
      }

      // Remove players and cancel room
      await supabaseAdmin
        .from("room_players")
        .delete()
        .eq("room_id", room.id);

      await supabaseAdmin
        .from("game_rooms")
        .update({ status: "cancelled" })
        .eq("id", room.id);

      closedCount++;
      console.log(`Auto-closed room ${room.id}, refunded ${room.bet_amount} to ${room.created_by}`);
    }

    return new Response(
      JSON.stringify({ message: `Closed ${closedCount} stale rooms`, closed: closedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in auto-close-rooms:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
