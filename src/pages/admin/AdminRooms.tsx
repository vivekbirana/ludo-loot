import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const AdminRooms = () => {
  const { data: rooms } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("game_rooms")
        .select("*, room_players(user_id, is_bot)")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "waiting": return "bg-warning/20 text-warning border-warning/30";
      case "in_progress": return "bg-primary/20 text-primary border-primary/30";
      case "finished": return "bg-muted text-muted-foreground border-border";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Rooms</h1>
        <p className="text-muted-foreground">Monitor active and past game rooms • {rooms?.length ?? 0} shown</p>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-heading">Code</TableHead>
              <TableHead className="font-heading">Status</TableHead>
              <TableHead className="font-heading">Bet</TableHead>
              <TableHead className="font-heading">Players</TableHead>
              <TableHead className="font-heading">Bots</TableHead>
              <TableHead className="font-heading">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rooms ?? []).map((room) => {
              const players = (room as any).room_players ?? [];
              const botCount = players.filter((p: any) => p.is_bot).length;
              return (
                <TableRow key={room.id} className="border-border/50">
                  <TableCell className="font-heading font-bold">{room.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs capitalize", statusColor(room.status))}>
                      {room.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-accent font-heading font-bold">₹{room.bet_amount}</TableCell>
                  <TableCell>{players.length}/{room.max_players}</TableCell>
                  <TableCell className="text-muted-foreground">{botCount}</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(room.created_at), "MMM d, HH:mm")}</TableCell>
                </TableRow>
              );
            })}
            {(!rooms || rooms.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No rooms found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminRooms;
