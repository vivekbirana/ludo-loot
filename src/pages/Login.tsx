import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, KeyRound, Loader2, AlertCircle } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    return digits;
  };

  const fullPhone = `+91${phone}`;
  const isValidPhone = /^[6-9]\d{9}$/.test(phone);

  const handleSendOtp = async () => {
    if (!isValidPhone) return;
    setLoading(true);
    setDevOtp(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone: fullPhone },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Dev mode: show OTP on screen
      if (data?.dev_otp) {
        setDevOtp(data.dev_otp);
        console.log(`[DEV] OTP for ${fullPhone}: ${data.dev_otp}`);
      }

      setStep("otp");
      setCountdown(30);
      toast.success(data?.dev_otp ? "OTP generated (dev mode)" : "OTP sent!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone: fullPhone, otp },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.session) {
        // Set the session in Supabase client
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        toast.success("Welcome to Ludo Tournament! 🎲");
        navigate("/", { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary mx-auto flex items-center justify-center text-3xl shadow-glow">
            🎲
          </div>
          <h1 className="text-3xl font-heading font-bold">Ludo Tournament</h1>
          <p className="text-muted-foreground text-sm">Play, bet & win real coins!</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "phone" ? (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Phone Number</label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 rounded-lg bg-secondary border border-border text-sm font-medium shrink-0">
                    🇮🇳 +91
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="9876543210"
                      className="pl-9 bg-secondary border-border"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      maxLength={10}
                      inputMode="numeric"
                    />
                  </div>
                </div>
                {phone.length > 0 && !isValidPhone && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Enter a valid 10-digit Indian mobile number
                  </p>
                )}
              </div>

              <Button
                className="w-full bg-gradient-primary font-heading font-bold text-primary-foreground shadow-glow"
                disabled={!isValidPhone || loading}
                onClick={handleSendOtp}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send OTP
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Dev mode OTP display */}
              {devOtp && (
                <div className="rounded-lg border border-accent/50 bg-accent/10 p-3 text-center">
                  <p className="text-xs text-accent uppercase tracking-wider font-medium mb-1">
                    🛠 Dev Mode OTP
                  </p>
                  <p className="text-2xl font-heading font-bold text-accent tracking-[0.3em]">
                    {devOtp}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Enter OTP sent to +91 {phone}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="123456"
                    className="pl-9 bg-secondary border-border text-center text-lg tracking-[0.3em] font-heading"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <Button
                className="w-full bg-gradient-primary font-heading font-bold text-primary-foreground shadow-glow"
                disabled={otp.length !== 6 || loading}
                onClick={handleVerifyOtp}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verify & Login
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setStep("phone"); setOtp(""); setDevOtp(null); }}
                >
                  ← Change number
                </button>
                <button
                  className="text-primary hover:text-primary/80 transition-colors disabled:text-muted-foreground"
                  disabled={countdown > 0 || loading}
                  onClick={handleSendOtp}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Login;
