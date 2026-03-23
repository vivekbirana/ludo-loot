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

  const { action, email, password } = await req.json();

  /* ── LOGIN ── */
  if (action === "login") {
    if (!email || !password) return json({ error: "Email and password required" }, 400);

    // Sign in
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (signInError) return json({ error: "Invalid credentials" }, 401);

    // Check admin role
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", signInData.user.id)
      .eq("role", "admin")
      .single();

    if (!roleRow) {
      return json({ error: "Access denied — not an admin" }, 403);
    }

    return json({
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    });
  }

  /* ── RESET PASSWORD REQUEST ── */
  if (action === "reset_request") {
    if (!email) return json({ error: "Email required" }, 400);

    // Verify user is admin before sending reset
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const adminUser = users?.users?.find((u) => u.email === email);
    if (!adminUser) return json({ error: "No admin account with that email" }, 404);

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .single();

    if (!roleRow) return json({ error: "No admin account with that email" }, 404);

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.get("origin")}/admin/reset-password`,
    });
    if (error) return json({ error: error.message }, 500);

    return json({ success: true });
  }

  /* ── UPDATE PASSWORD ── */
  if (action === "update_password") {
    if (!password) return json({ error: "New password required" }, 400);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return json({ error: "Invalid session" }, 401);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
    if (error) return json({ error: error.message }, 500);

    return json({ success: true });
  }

  /* ── CHECK ADMIN ── */
  if (action === "check") {
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

    return json({ isAdmin: !!roleRow });
  }

  return json({ error: "Unknown action" }, 400);
});
