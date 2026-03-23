import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Gamepad2, Receipt, ChevronLeft, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

const adminNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Gamepad2, label: "Rooms", path: "/admin/rooms" },
  { icon: Receipt, label: "Transactions", path: "/admin/transactions" },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-check", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: { action: "check" },
      });
      if (error || data?.error) return false;
      return data?.isAdmin === true;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login", { replace: true });
    }
    if (!authLoading && !roleLoading && user && isAdmin === false) {
      toast.error("Access denied — not an admin");
      navigate("/admin/login", { replace: true });
    }
  }, [authLoading, roleLoading, user, isAdmin, navigate]);

  if (authLoading || roleLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/admin/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Logout
          </Link>
          <h1 className="text-xl font-heading font-bold mt-3 text-gradient-primary">
            Ludo Admin
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {adminNav.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto">
          {adminNav.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
          <button onClick={handleLogout} className="ml-auto px-2 py-1.5 text-destructive">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-6 md:p-8 mt-12 md:mt-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
