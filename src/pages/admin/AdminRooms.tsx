import RoomCard from "@/components/RoomCard";

const mockRooms = [
  { code: "A1B2", betAmount: 100, playerCount: 1, maxPlayers: 2, status: "waiting" as const },
  { code: "C3D4", betAmount: 200, playerCount: 3, maxPlayers: 4, status: "in_progress" as const },
  { code: "E5F6", betAmount: 500, playerCount: 4, maxPlayers: 4, status: "in_progress" as const },
  { code: "G7H8", betAmount: 50, playerCount: 2, maxPlayers: 2, status: "finished" as const },
  { code: "I9J0", betAmount: 100, playerCount: 4, maxPlayers: 4, status: "finished" as const },
];

const AdminRooms = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Rooms</h1>
        <p className="text-muted-foreground">Monitor active and past game rooms</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {mockRooms.map((room) => (
          <RoomCard key={room.code} {...room} />
        ))}
      </div>
    </div>
  );
};

export default AdminRooms;
