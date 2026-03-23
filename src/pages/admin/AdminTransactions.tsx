import { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const AdminTransactions = () => {
  const [search, setSearch] = useState("");

  const { data: transactions } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      // Fetch transactions + map user_id to profile phone
      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!txs) return [];

      const userIds = [...new Set(txs.map((t) => t.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, phone, display_name").in("user_id", userIds);
      const profileMap: Record<string, string> = {};
      for (const p of profiles ?? []) profileMap[p.user_id] = p.display_name || p.phone;

      return txs.map((t) => ({
        ...t,
        userName: profileMap[t.user_id] ?? t.user_id.slice(0, 8),
      }));
    },
    refetchInterval: 15000,
  });

  const filtered = (transactions ?? []).filter((t) =>
    t.userName.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Transactions</h1>
        <p className="text-muted-foreground">All wallet transactions across the platform</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by user or description..."
          className="pl-9 bg-secondary border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-heading">Type</TableHead>
              <TableHead className="font-heading">User</TableHead>
              <TableHead className="font-heading">Description</TableHead>
              <TableHead className="font-heading">Amount</TableHead>
              <TableHead className="font-heading">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((tx) => (
              <TableRow key={tx.id} className="border-border/50">
                <TableCell>
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center",
                    tx.type === "credit" ? "bg-primary/20" : "bg-destructive/20"
                  )}>
                    {tx.type === "credit" ? (
                      <ArrowDownLeft className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{tx.userName}</TableCell>
                <TableCell className="text-muted-foreground">{tx.description}</TableCell>
                <TableCell className={cn(
                  "font-heading font-bold",
                  tx.type === "credit" ? "text-primary" : "text-destructive"
                )}>
                  {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(tx.created_at), "MMM d, HH:mm")}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No transactions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminTransactions;
