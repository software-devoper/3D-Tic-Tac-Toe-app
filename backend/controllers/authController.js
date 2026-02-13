import { upsertUserProfile } from "../services/roomService.js";

export async function syncProfile(req, res) {
  try {
    const user = await upsertUserProfile(req.user);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to sync profile." });
  }
}
