import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockUsers = [
  { id: "1", phone: "+91 98765 43210", balance: 1500, games: 12, wins: 5, joined: "2024-01-15" },
  { id: "2", phone: "+91 87654 32109", balance: 800, games: 8, wins: 3, joined: "2024-01-16" },
  { id: "3", phone: "+91 76543 21098", balance: 2200, games: 25, wins: 12, joined: "2024-01-10" },
  { id: "4", phone: "+91 65432 10987", balance: 450, games: 6, wins: 1, joined: "2024-01-18" },
  { id: "5", phone: "+91 54321 09876", balance: 3100, games: 30, wins: 18, joined: "2024-01-08" },
];

const AdminUsers = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and balances</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by phone..." className="pl-9 bg-secondary border-border" />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-heading">Phone</TableHead>
              <TableHead className="font-heading">Balance</TableHead>
              <TableHead className="font-heading">Games</TableHead>
              <TableHead className="font-heading">Wins</TableHead>
              <TableHead className="font-heading">Joined</TableHead>
              <TableHead className="font-heading">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockUsers.map((user) => (
              <TableRow key={user.id} className="border-border/50">
                <TableCell className="font-medium">{user.phone}</TableCell>
                <TableCell className="text-accent font-heading font-bold">₹{user.balance}</TableCell>
                <TableCell>{user.games}</TableCell>
                <TableCell>{user.wins}</TableCell>
                <TableCell className="text-muted-foreground">{user.joined}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="font-heading text-xs">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminUsers;
