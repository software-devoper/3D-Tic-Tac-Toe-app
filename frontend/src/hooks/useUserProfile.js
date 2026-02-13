import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

export default function useUserProfile() {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return null;

    return {
      id: user.id,
      username: user.user_metadata?.username || user.email?.split("@")[0] || "Player",
      avatarUrl:
        user.user_metadata?.avatar_url ||
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.email || user.id)}`
    };
  }, [user]);
}
