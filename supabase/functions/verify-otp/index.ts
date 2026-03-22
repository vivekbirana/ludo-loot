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
    const { phone, otp } = await req.json();

    // Validate inputs
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!otp || !/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: "Invalid OTP format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find valid OTP
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("code", otp)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    await supabaseAdmin
      .from("otp_codes")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let user = existingUsers?.users?.find((u) => u.phone === phone);

    // Generate a deterministic password using phone + service role key
    const encoder = new TextEncoder();
    const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      keyMaterial,
      encoder.encode(phone)
    );
    const password = btoa(String.fromCharCode(...new Uint8Array(signature)));

    if (!user) {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone,
        phone_confirm: true,
        password,
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }
      user = newUser.user;
    } else {
      // Update password for existing user
      await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
    }

    // Sign in to get session
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: session, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      phone,
      password,
    });

    if (signInError) {
      throw new Error(`Failed to sign in: ${signInError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: session.session,
        user: {
          id: user!.id,
          phone: user!.phone,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in verify-otp:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
