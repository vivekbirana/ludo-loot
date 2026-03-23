import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { action, room_id, bet_amount } = await req.json();

    if (action === "deduct") {
      if (typeof bet_amount !== "number" || bet_amount <= 0) {
        return jsonResponse({ error: "Invalid bet amount" }, 400);
      }

      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (!wallet || wallet.balance < bet_amount) {
        return jsonResponse({ error: "Insufficient balance" }, 400);
      }

      await supabaseAdmin
        .from("wallets")
        .update({ balance: wallet.balance - bet_amount })
        .eq("user_id", user.id);

      await supabaseAdmin.from("transactions").insert({
        user_id: user.id,
        type: "debit",
        amount: bet_amount,
        description: `Bet placed for room`,
      });

      return jsonResponse({ success: true });
    }

    if (action === "refund") {
      if (!room_id) {
        return jsonResponse({ error: "room_id required" }, 400);
      }

      // Verify room exists
      const { data: room } = await supabaseAdmin
        .from("game_rooms")
        .select("bet_amount, status")
        .eq("id", room_id)
        .single();

      if (!room) {
        return jsonResponse({ error: "Room not found" }, 404);
      }

      // Only refund if room is still waiting
      if (room.status !== "waiting") {
        return jsonResponse({ error: "Cannot refund - game already started" }, 400);
      }

      // Verify caller is actually a player in this room
      const { data: playerRecord } = await supabaseAdmin
        .from("room_players")
        .select("id")
        .eq("room_id", room_id)
        .eq("user_id", user.id)
        .single();

      if (!playerRecord) {
        return jsonResponse({ error: "You are not a player in this room" }, 403);
      }

      // Check if user was already refunded (look for existing refund transaction for this room)
      const { data: existingRefund } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "credit")
        .eq("amount", room.bet_amount)
        .like("description", `%${room_id}%`)
        .limit(1);

      if (existingRefund && existingRefund.length > 0) {
        return jsonResponse({ error: "Already refunded" }, 400);
      }

      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (wallet) {
        await supabaseAdmin
          .from("wallets")
          .update({ balance: wallet.balance + room.bet_amount })
          .eq("user_id", user.id);

        await supabaseAdmin.from("transactions").insert({
          user_id: user.id,
          type: "credit",
          amount: room.bet_amount,
          description: `Left room ${room_id} — bet refunded`,
        });
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    console.error("Error in deduct-bet:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: errorMessage }, 500);
  }
});
