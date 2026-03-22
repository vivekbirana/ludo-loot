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
    const { phone } = await req.json();

    // Validate +91 Indian number
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid Indian phone number. Must be +91 followed by 10 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

    // Invalidate previous OTPs for this phone
    await supabaseAdmin
      .from("otp_codes")
      .update({ verified: true })
      .eq("phone", phone)
      .eq("verified", false);

    // Store new OTP
    const { error: insertError } = await supabaseAdmin.from("otp_codes").insert({
      phone,
      code: otp,
      expires_at: expiresAt,
    });

    if (insertError) {
      throw new Error(`Failed to store OTP: ${insertError.message}`);
    }

    // Check if Twilio is configured
    const twilioApiKey = Deno.env.get("TWILIO_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    let smsSent = false;

    if (twilioApiKey && lovableApiKey) {
      // Send via Twilio gateway
      const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
      const twilioResponse = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "X-Connection-Api-Key": twilioApiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: Deno.env.get("TWILIO_PHONE_NUMBER") || "+15017122661",
          Body: `Your Ludo Tournament OTP is: ${otp}. Valid for 5 minutes.`,
        }),
      });

      const twilioData = await twilioResponse.json();
      if (!twilioResponse.ok) {
        console.error("Twilio error:", JSON.stringify(twilioData));
        // Fall through to dev mode
      } else {
        smsSent = true;
      }
    }

    // DEV MODE: Log OTP to console
    console.log(`[DEV] OTP for ${phone}: ${otp}`);

    const response: Record<string, unknown> = {
      success: true,
      message: smsSent
        ? "OTP sent via SMS"
        : "OTP generated (dev mode - check response)",
    };

    // In dev mode (no Twilio), include OTP in response
    if (!smsSent) {
      response.dev_otp = otp;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in send-otp:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
