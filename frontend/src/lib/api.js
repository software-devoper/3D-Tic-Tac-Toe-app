import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL
});

export function withAuth(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
}
