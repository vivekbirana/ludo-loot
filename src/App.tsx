import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import PlayerLayout from "@/components/layout/PlayerLayout";
import AdminLayout from "@/pages/admin/AdminLayout";
import Index from "./pages/Index";
import Play from "./pages/Play";
import LiveGames from "./pages/LiveGames";
import GameScreen from "./pages/GameScreen";
import History from "./pages/History";
import Ranking from "./pages/Ranking";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminTransactions from "./pages/admin/AdminTransactions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Game screen - no bottom nav */}
            <Route path="/game/:roomId" element={<ProtectedRoute><GameScreen /></ProtectedRoute>} />
            
            {/* Player routes - protected */}
            <Route element={<ProtectedRoute><PlayerLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/play" element={<Play />} />
              <Route path="/live" element={<LiveGames />} />
              <Route path="/history" element={<History />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Admin routes - protected */}
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="rooms" element={<AdminRooms />} />
              <Route path="transactions" element={<AdminTransactions />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
