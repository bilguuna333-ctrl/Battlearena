import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { API_BASE_URL } from "./lib/api";

setBaseUrl(API_BASE_URL);

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "missing";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={clientId}>
    <App />
  </GoogleOAuthProvider>
);
