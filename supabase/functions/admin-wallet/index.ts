import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify caller is admin
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "Not authenticated" }, 401);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !user) return json({ error: "Invalid session" }, 401);

  const { data: roleRow } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();

  if (!roleRow) return json({ error: "Access denied" }, 403);

  const { action, target_user_id, amount, description } = await req.json();

  if (action === "adjust_balance") {
    if (!target_user_id || !amount || !description) {
      return json({ error: "target_user_id, amount, and description required" }, 400);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      return json({ error: "Amount must be a non-zero number" }, 400);
    }

    // Get current balance
    const { data: wallet, error: walletErr } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", target_user_id)
      .single();

    if (walletErr || !wallet) return json({ error: "Wallet not found" }, 404);

    const newBalance = wallet.balance + numAmount;
    if (newBalance < 0) return json({ error: "Insufficient balance for deduction" }, 400);

    // Update wallet
    const { error: updateErr } = await supabaseAdmin
      .from("wallets")
      .update({ balance: newBalance })
      .eq("user_id", target_user_id);

    if (updateErr) return json({ error: updateErr.message }, 500);

    // Record transaction
    const { error: txErr } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: target_user_id,
        type: numAmount > 0 ? "credit" : "debit",
        amount: Math.abs(numAmount),
        description: `[Admin] ${description}`,
      });

    if (txErr) return json({ error: txErr.message }, 500);

    return json({ success: true, new_balance: newBalance });
  }

  return json({ error: "Unknown action" }, 400);
});
