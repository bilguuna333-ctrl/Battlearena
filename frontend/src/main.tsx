import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";
import { GoogleOAuthProvider } from "@react-oauth/google";

setBaseUrl("http://localhost:5000");

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "missing";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={clientId}>
    <App />
  </GoogleOAuthProvider>
);
