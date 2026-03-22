import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const mockTx = [
  { id: "1", user: "+91 98765 43210", type: "credit", amount: 1000, desc: "Welcome bonus", date: "2024-01-18 14:30" },
  { id: "2", user: "+91 98765 43210", type: "debit", amount: 100, desc: "Joined room #A1B2", date: "2024-01-18 15:00" },
  { id: "3", user: "+91 87654 32109", type: "credit", amount: 200, desc: "Won 2P match", date: "2024-01-18 15:25" },
  { id: "4", user: "+91 76543 21098", type: "debit", amount: 200, desc: "Joined room #C3D4", date: "2024-01-18 16:00" },
  { id: "5", user: "+91 65432 10987", type: "credit", amount: 800, desc: "Won 4P match", date: "2024-01-18 16:45" },
];

const AdminTransactions = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Transactions</h1>
        <p className="text-muted-foreground">All wallet transactions across the platform</p>
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
            {mockTx.map((tx) => (
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
                <TableCell className="font-medium">{tx.user}</TableCell>
                <TableCell className="text-muted-foreground">{tx.desc}</TableCell>
                <TableCell className={cn(
                  "font-heading font-bold",
                  tx.type === "credit" ? "text-primary" : "text-destructive"
                )}>
                  {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{tx.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminTransactions;
