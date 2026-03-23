import { useState } from "react";
import { Search, Plus, Minus, Eye, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  phone: string;
  displayName: string | null;
  balance: number;
  games: number;
  wins: number;
  joined: string;
}

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [walletDialog, setWalletDialog] = useState<{ user: UserData; mode: "add" | "remove" } | null>(null);
  const [coinAmount, setCoinAmount] = useState("");
  const [coinReason, setCoinReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (!profiles) return [];

      const userIds = profiles.map((p) => p.user_id);

      const [walletsRes, roomPlayersRes, matchesRes] = await Promise.all([
        supabase.from("wallets").select("user_id, balance").in("user_id", userIds),
        supabase.from("room_players").select("user_id, room_id").in("user_id", userIds),
        supabase.from("match_records").select("winner_user_id"),
      ]);

      const balanceMap: Record<string, number> = {};
      for (const w of walletsRes.data ?? []) balanceMap[w.user_id] = w.balance;

      const gamesMap: Record<string, number> = {};
      for (const rp of roomPlayersRes.data ?? []) {
        gamesMap[rp.user_id] = (gamesMap[rp.user_id] ?? 0) + 1;
      }

      const winsMap: Record<string, number> = {};
      for (const m of matchesRes.data ?? []) {
        if (m.winner_user_id) winsMap[m.winner_user_id] = (winsMap[m.winner_user_id] ?? 0) + 1;
      }

      return profiles.map((p) => ({
        id: p.user_id,
        phone: p.phone,
        displayName: p.display_name,
        balance: balanceMap[p.user_id] ?? 0,
        games: gamesMap[p.user_id] ?? 0,
        wins: winsMap[p.user_id] ?? 0,
        joined: p.created_at,
      }));
    },
    refetchInterval: 30000,
  });

  // Fetch match history for selected user
  const { data: userMatches } = useQuery({
    queryKey: ["admin-user-matches", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const { data } = await supabase
        .from("match_records")
        .select("*")
        .order("finished_at", { ascending: false });

      if (!data) return [];

      // Filter matches where user participated
      return data.filter((m) => {
        const players = m.players as Array<{ user_id: string }>;
        return Array.isArray(players) && players.some((p) => p.user_id === selectedUser.id);
      });
    },
    enabled: !!selectedUser,
  });

  // Fetch transactions for selected user
  const { data: userTransactions } = useQuery({
    queryKey: ["admin-user-transactions", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", selectedUser.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!selectedUser,
  });

  const filtered = (users ?? []).filter((u) =>
    u.phone.includes(search) || (u.displayName?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdjustBalance = async () => {
    if (!walletDialog || !coinAmount || !coinReason) return;
    const amt = parseInt(coinAmount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid positive amount"); return; }

    setAdjusting(true);
    try {
      const finalAmount = walletDialog.mode === "add" ? amt : -amt;
      const { data, error } = await supabase.functions.invoke("admin-wallet", {
        body: {
          action: "adjust_balance",
          target_user_id: walletDialog.user.id,
          amount: finalAmount,
          description: coinReason,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`₹${amt} ${walletDialog.mode === "add" ? "added to" : "removed from"} ${walletDialog.user.phone}`);
      setWalletDialog(null);
      setCoinAmount("");
      setCoinReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (selectedUser?.id === walletDialog.user.id) {
        queryClient.invalidateQueries({ queryKey: ["admin-user-transactions", selectedUser.id] });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust balance");
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Users</h1>
        <p className="text-muted-foreground">Manage user accounts and balances • {users?.length ?? 0} total</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by phone number..."
          className="pl-9 bg-secondary border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-heading">Phone</TableHead>
              <TableHead className="font-heading">Name</TableHead>
              <TableHead className="font-heading">Balance</TableHead>
              <TableHead className="font-heading">Games</TableHead>
              <TableHead className="font-heading">Wins</TableHead>
              <TableHead className="font-heading">Joined</TableHead>
              <TableHead className="font-heading">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id} className="border-border/50">
                <TableCell className="font-medium">{user.phone}</TableCell>
                <TableCell className="text-muted-foreground">{user.displayName || "—"}</TableCell>
                <TableCell className="text-accent font-heading font-bold">₹{user.balance}</TableCell>
                <TableCell>{user.games}</TableCell>
                <TableCell>{user.wins}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(user.joined), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      title="View details"
                      onClick={() => setSelectedUser(user)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-primary hover:text-primary"
                      title="Add coins"
                      onClick={() => setWalletDialog({ user, mode: "add" })}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Remove coins"
                      onClick={() => setWalletDialog({ user, mode: "remove" })}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Remove Coins Dialog */}
      <Dialog open={!!walletDialog} onOpenChange={() => { setWalletDialog(null); setCoinAmount(""); setCoinReason(""); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {walletDialog?.mode === "add" ? "Add Coins" : "Remove Coins"} — {walletDialog?.user.phone}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Current balance: <span className="text-accent font-heading font-bold">₹{walletDialog?.user.balance}</span>
            </p>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Amount (₹)</label>
              <Input
                type="number"
                placeholder="100"
                className="bg-secondary border-border"
                value={coinAmount}
                onChange={(e) => setCoinAmount(e.target.value)}
                min={1}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Reason</label>
              <Input
                placeholder="e.g. Manual bonus, Refund, Penalty..."
                className="bg-secondary border-border"
                value={coinReason}
                onChange={(e) => setCoinReason(e.target.value)}
              />
            </div>
            <Button
              className={cn(
                "w-full font-heading font-bold",
                walletDialog?.mode === "add"
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "bg-destructive text-destructive-foreground"
              )}
              disabled={!coinAmount || !coinReason || adjusting}
              onClick={handleAdjustBalance}
            >
              {walletDialog?.mode === "add" ? `Add ₹${coinAmount || "0"}` : `Remove ₹${coinAmount || "0"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {selectedUser?.displayName || selectedUser?.phone}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 pt-2">
              {/* User Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="text-lg font-heading font-bold text-accent">₹{selectedUser.balance}</p>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Games</p>
                  <p className="text-lg font-heading font-bold">{selectedUser.games}</p>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Wins</p>
                  <p className="text-lg font-heading font-bold text-primary">{selectedUser.wins}</p>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-lg font-heading font-bold">
                    {selectedUser.games > 0 ? `${Math.round((selectedUser.wins / selectedUser.games) * 100)}%` : "0%"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-gradient-primary text-primary-foreground font-heading"
                  onClick={() => { setSelectedUser(null); setWalletDialog({ user: selectedUser, mode: "add" }); }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Coins
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="font-heading"
                  onClick={() => { setSelectedUser(null); setWalletDialog({ user: selectedUser, mode: "remove" }); }}
                >
                  <Minus className="w-3.5 h-3.5 mr-1" /> Remove Coins
                </Button>
              </div>

              {/* Match History */}
              <div>
                <h3 className="text-base font-heading font-bold mb-3">Match History</h3>
                <div className="glass rounded-lg overflow-hidden">
                  {(userMatches ?? []).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                          <TableHead className="font-heading text-xs">Room</TableHead>
                          <TableHead className="font-heading text-xs">Bet</TableHead>
                          <TableHead className="font-heading text-xs">Players</TableHead>
                          <TableHead className="font-heading text-xs">Result</TableHead>
                          <TableHead className="font-heading text-xs">Reason</TableHead>
                          <TableHead className="font-heading text-xs">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(userMatches ?? []).map((m) => {
                          const isWinner = m.winner_user_id === selectedUser.id;
                          return (
                            <TableRow key={m.id} className="border-border/50">
                              <TableCell className="font-heading font-bold text-xs">{m.room_code}</TableCell>
                              <TableCell className="text-accent font-heading font-bold text-xs">₹{m.bet_amount}</TableCell>
                              <TableCell className="text-xs">{m.player_count}P</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    isWinner
                                      ? "bg-primary/20 text-primary border-primary/30"
                                      : "bg-destructive/20 text-destructive border-destructive/30"
                                  )}
                                >
                                  {isWinner ? "Won" : "Lost"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground capitalize">{m.finish_reason}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(m.finished_at), "MMM d, HH:mm")}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No matches found</p>
                  )}
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <h3 className="text-base font-heading font-bold mb-3">Recent Transactions</h3>
                <div className="glass rounded-lg overflow-hidden">
                  {(userTransactions ?? []).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                          <TableHead className="font-heading text-xs">Type</TableHead>
                          <TableHead className="font-heading text-xs">Description</TableHead>
                          <TableHead className="font-heading text-xs">Amount</TableHead>
                          <TableHead className="font-heading text-xs">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(userTransactions ?? []).map((tx) => (
                          <TableRow key={tx.id} className="border-border/50">
                            <TableCell>
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center",
                                tx.type === "credit" ? "bg-primary/20" : "bg-destructive/20"
                              )}>
                                {tx.type === "credit" ? (
                                  <ArrowDownLeft className="w-3 h-3 text-primary" />
                                ) : (
                                  <ArrowUpRight className="w-3 h-3 text-destructive" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{tx.description}</TableCell>
                            <TableCell className={cn(
                              "font-heading font-bold text-xs",
                              tx.type === "credit" ? "text-primary" : "text-destructive"
                            )}>
                              {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "MMM d, HH:mm")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No transactions found</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
