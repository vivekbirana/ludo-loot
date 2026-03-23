import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2, ShieldCheck } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: { action: "login", email, password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      toast.success("Welcome, Admin! 🛡️");
      navigate("/admin", { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { toast.error("Enter your admin email"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: { action: "reset_request", email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Password reset link sent to your email");
      setMode("login");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
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
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary mx-auto flex items-center justify-center shadow-glow">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Ludo Loot Management Console</p>
        </div>

        {mode === "login" ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="admin@ludoloot.com"
                  className="pl-9 bg-secondary border-border"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 bg-secondary border-border"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>
            <Button
              className="w-full bg-gradient-primary font-heading font-bold text-primary-foreground shadow-glow"
              disabled={!email || !password || loading}
              onClick={handleLogin}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Sign In
            </Button>
            <button
              className="block mx-auto text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMode("forgot")}
            >
              Forgot password?
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="admin@ludoloot.com"
                  className="pl-9 bg-secondary border-border"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="w-full bg-gradient-primary font-heading font-bold text-primary-foreground shadow-glow"
              disabled={!email || loading}
              onClick={handleForgotPassword}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send Reset Link
            </Button>
            <button
              className="block mx-auto text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMode("login")}
            >
              ← Back to login
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminLogin;
