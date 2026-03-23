import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { email, password, secret_key } = await req.json();

  // Simple setup key to prevent unauthorized use — change after first use
  if (secret_key !== "LUDO_ADMIN_SETUP_2024") {
    return new Response(JSON.stringify({ error: "Invalid setup key" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email and password required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create the auth user with email/password
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Assign admin role
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: authData.user.id, role: "admin" });

  if (roleError) {
    return new Response(JSON.stringify({ error: roleError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
