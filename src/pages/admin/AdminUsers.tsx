import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const AdminUsers = () => {
  const [search, setSearch] = useState("");

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

  const filtered = (users ?? []).filter((u) =>
    u.phone.includes(search) || (u.displayName?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Users</h1>
        <p className="text-muted-foreground">Manage user accounts and balances • {users?.length ?? 0} total</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by phone or name..."
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
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminUsers;
