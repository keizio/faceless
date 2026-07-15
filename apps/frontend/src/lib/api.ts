import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      auth.signOut();
      window.location.href = "/login";
    } else if (error.response?.status === 429) {
      import("sonner").then(({ toast }) =>
        toast.warning("Too many requests. Please slow down."),
      );
    } else if (error.response?.status >= 500) {
      import("sonner").then(({ toast }) =>
        toast.error("Server error. Please try again later."),
      );
    }
    return Promise.reject(error);
  },
);

export { api };
