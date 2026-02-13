import { supabase } from "./supabaseClient.js";

export async function upsertUserProfile(user) {
  const payload = {
    id: user.id,
    username:
      user.user_metadata?.username ||
      user.email?.split("@")[0] ||
      `user_${user.id.slice(0, 8)}`,
    email: user.email,
    avatar_url: user.user_metadata?.avatar_url || null
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createRoom({ roomId, hostId }) {
  const { data, error } = await supabase
    .from("rooms")
    .insert({ id: roomId, host_id: hostId, status: "waiting" })
    .select()
    .single();

  if (error) throw error;

  const { error: participantError } = await supabase.from("room_participants").insert({
    room_id: roomId,
    user_id: hostId,
    role: "host",
    is_approved_player: true,
    hand_raised: false
  });

  if (participantError) throw participantError;
  return data;
}

export async function addParticipant({ roomId, userId, role = "spectator" }) {
  const { error } = await supabase.from("room_participants").upsert(
    {
      room_id: roomId,
      user_id: userId,
      role,
      hand_raised: false
    },
    { onConflict: "room_id,user_id" }
  );

  if (error) throw error;
}

export async function updateRaiseHand({ roomId, userId, raised }) {
  const { error } = await supabase
    .from("room_participants")
    .update({ hand_raised: raised })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function approveGuestPlayer({ roomId, userId }) {
  const { error: resetError } = await supabase
    .from("room_participants")
    .update({ is_approved_player: false })
    .eq("room_id", roomId)
    .eq("role", "guest");

  if (resetError) throw resetError;

  const { error } = await supabase
    .from("room_participants")
    .update({ role: "guest", is_approved_player: true, hand_raised: false })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) throw error;

  const { error: roomError } = await supabase
    .from("rooms")
    .update({ status: "playing" })
    .eq("id", roomId);

  if (roomError) throw roomError;
}

export async function removeParticipant({ roomId, userId }) {
  const { error } = await supabase
    .from("room_participants")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function closeRoom(roomId) {
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) throw error;
}

export async function finishRoom(roomId) {
  const { error } = await supabase
    .from("rooms")
    .update({ status: "finished" })
    .eq("id", roomId);

  if (error) throw error;
}

export async function createGame({ roomId }) {
  const { data, error } = await supabase
    .from("games")
    .insert({ room_id: roomId, board: Array(9).fill(null), turn: "X", status: "playing" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGame({ roomId, board, turn, status, winner }) {
  const { error } = await supabase
    .from("games")
    .update({ board, turn, status, winner })
    .eq("room_id", roomId)
    .eq("status", "playing");

  if (error) throw error;
}

export async function getRoomParticipants(roomId) {
  const { data, error } = await supabase
    .from("room_participants")
    .select("user_id, role, hand_raised, is_approved_player, users(username, avatar_url)")
    .eq("room_id", roomId);

  if (error) throw error;
  return data;
}

export async function getRoomById(roomId) {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, host_id, status, created_at")
    .eq("id", roomId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getLatestGameByRoomId(roomId) {
  const { data, error } = await supabase
    .from("games")
    .select("board, turn, winner, status")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
