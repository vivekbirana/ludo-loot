import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GameRoom {
  id: string;
  code: string;
  bet_amount: number;
  max_players: number;
  status: string;
  created_by: string;
  winner_id: string | null;
  created_at: string;
  players: RoomPlayer[];
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  is_ready: boolean;
  joined_at: string;
  display_name?: string;
  color_index?: number | null;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function useGameRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    const { data: roomsData, error } = await supabase
      .from("game_rooms")
      .select("*")
      .in("status", ["waiting", "in_progress"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching rooms:", error);
      return;
    }

    if (!roomsData || roomsData.length === 0) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const roomIds = roomsData.map((r) => r.id);
    const { data: playersData } = await supabase
      .from("room_players")
      .select("*")
      .in("room_id", roomIds);

    // Get display names
    const userIds = [...new Set((playersData || []).map((p) => p.user_id))];
    let profilesMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", userIds);
      profiles?.forEach((p) => {
        profilesMap[p.user_id] = p.display_name || p.phone.slice(-4);
      });
    }

    const enrichedRooms: GameRoom[] = roomsData.map((room) => ({
      ...room,
      players: (playersData || [])
        .filter((p) => p.room_id === room.id)
        .map((p) => ({ ...p, display_name: profilesMap[p.user_id] || "Player" })),
    }));

    setRooms(enrichedRooms);

    // Update current room if user is in one
    if (user) {
      const userRoom = enrichedRooms.find((r) =>
        r.players.some((p) => p.user_id === user.id)
      );
      setCurrentRoom(userRoom || null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRooms();

    const roomChannel = supabase
      .channel("game-rooms-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms" }, () => {
        fetchRooms();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players" }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [fetchRooms]);

  const createRoom = async (betAmount: number, maxPlayers: number) => {
    if (!user) return;

    // Check wallet balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!wallet || wallet.balance < betAmount) {
      toast.error("Insufficient balance");
      return;
    }

    // Deduct bet upfront
    const { error: deductError } = await supabase.functions.invoke("deduct-bet", {
      body: { action: "deduct", bet_amount: betAmount },
    });

    if (deductError) {
      toast.error("Failed to deduct bet");
      console.error(deductError);
      return;
    }

    const code = generateRoomCode();

    const { data: room, error } = await supabase
      .from("game_rooms")
      .insert({ code, bet_amount: betAmount, max_players: maxPlayers, created_by: user.id })
      .select()
      .single();

    if (error) {
      // Refund if room creation fails
      await supabase.functions.invoke("deduct-bet", {
        body: { action: "refund", room_id: room?.id },
      });
      toast.error("Failed to create room");
      console.error(error);
      return;
    }

    // Join the room as first player
    const { error: joinError } = await supabase
      .from("room_players")
      .insert({ room_id: room.id, user_id: user.id });

    if (joinError) {
      toast.error("Failed to join room");
      console.error(joinError);
      return;
    }

    toast.success(`Room #${code} created! ₹${betAmount} deducted.`);
    return room;
  };

  const joinRoom = async (roomId: string) => {
    if (!user) return;

    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    if (room.players.length >= room.max_players) {
      toast.error("Room is full");
      return;
    }

    if (room.players.some((p) => p.user_id === user.id)) {
      toast.info("Already in this room");
      return;
    }

    // Check wallet balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!wallet || wallet.balance < room.bet_amount) {
      toast.error("Insufficient balance");
      return;
    }

    const { error } = await supabase
      .from("room_players")
      .insert({ room_id: roomId, user_id: user.id });

    if (error) {
      toast.error("Failed to join room");
      console.error(error);
      return;
    }

    toast.success(`Joined room #${room.code}!`);
  };

  const joinByCode = async (code: string) => {
    const room = rooms.find((r) => r.code === code.toUpperCase());
    if (!room) {
      toast.error("Room not found");
      return;
    }
    await joinRoom(room.id);
  };

  const toggleReady = async () => {
    if (!user || !currentRoom) return;

    const player = currentRoom.players.find((p) => p.user_id === user.id);
    if (!player) return;

    const { error } = await supabase
      .from("room_players")
      .update({ is_ready: !player.is_ready })
      .eq("id", player.id);

    if (error) {
      toast.error("Failed to update ready status");
      console.error(error);
    }
  };

  const selectColor = async (colorIndex: number) => {
    if (!user || !currentRoom) return;

    const player = currentRoom.players.find((p) => p.user_id === user.id);
    if (!player) return;

    // Check if color is taken by another player
    const taken = currentRoom.players.some(
      (p) => p.user_id !== user.id && p.color_index === colorIndex
    );
    if (taken) {
      toast.error("That color is already taken!");
      return;
    }

    const { error } = await supabase
      .from("room_players")
      .update({ color_index: colorIndex } as any)
      .eq("id", player.id);

    if (error) {
      toast.error("Failed to select color");
      console.error(error);
    }
  };

  const leaveRoom = async () => {
    if (!user || !currentRoom) return;

    const { error } = await supabase
      .from("room_players")
      .delete()
      .eq("room_id", currentRoom.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to leave room");
      console.error(error);
      return;
    }

    // If creator leaves and room is empty, update status
    if (currentRoom.created_by === user.id && currentRoom.players.length <= 1) {
      await supabase
        .from("game_rooms")
        .update({ status: "cancelled" })
        .eq("id", currentRoom.id);
    }

    setCurrentRoom(null);
    toast.success("Left the room");
  };

  const startGame = async () => {
    if (!user || !currentRoom) return;
    if (currentRoom.created_by !== user.id) {
      toast.error("Only the room creator can start the game");
      return;
    }

    const { error } = await supabase
      .from("game_rooms")
      .update({ status: "in_progress" })
      .eq("id", currentRoom.id);

    if (error) {
      toast.error("Failed to start game");
      console.error(error);
      return;
    }

    toast.success("Game started!");
  };

  const fillWithBots = async () => {
    if (!user || !currentRoom) return;

    const slotsNeeded = currentRoom.max_players - currentRoom.players.length;
    if (slotsNeeded <= 0) {
      toast.info("Room is already full");
      return;
    }

    const { data, error } = await supabase.functions.invoke("add-bots", {
      body: { room_id: currentRoom.id, count: slotsNeeded },
    });

    if (error) {
      toast.error("Failed to add bots");
      console.error(error);
      return;
    }

    toast.success(`Added ${data.bots_added} bot(s)!`);
  };

  return {
    rooms,
    currentRoom,
    loading,
    createRoom,
    joinRoom,
    joinByCode,
    toggleReady,
    selectColor,
    leaveRoom,
    startGame,
    fillWithBots,
  };
}
