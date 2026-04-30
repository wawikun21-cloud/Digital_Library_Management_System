// ─────────────────────────────────────────────────────────
//  pages/Unauthorized.jsx
//  Shown when a user tries to access a route outside their role.
// ─────────────────────────────────────────────────────────

import { useNavigate } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../constants/index.js";
import { ROLE_DEFAULT_ROUTES } from "../constants/roles.js";

export default function Unauthorized() {
  const navigate = useNavigate();
  const [user]   = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);

  const handleGoBack = () => {
    const role     = user?.role ?? "admin";
    const fallback = ROLE_DEFAULT_ROUTES[role] ?? "/dashboard";
    navigate(fallback, { replace: true });
  };

  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      minHeight:      "60vh",
      gap:            "16px",
      textAlign:      "center",
      padding:        "32px",
    }}>
      <span style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        width:           "72px",
        height:          "72px",
        borderRadius:    "50%",
        background:      "rgba(239,68,68,0.08)",
      }}>
        <ShieldOff size={36} style={{ color: "#ef4444" }} />
      </span>

      <h1 style={{
        fontSize:   "28px",
        fontWeight: "700",
        color:      "var(--text-primary, #111)",
        margin:     0,
      }}>
        Access Denied
      </h1>

      <p style={{
        fontSize:  "15px",
        color:     "var(--text-secondary, #6b7280)",
        maxWidth:  "340px",
        lineHeight: 1.6,
        margin:    0,
      }}>
        You don't have permission to view this page. Please contact your administrator
        if you think this is a mistake.
      </p>

      <button
        onClick={handleGoBack}
        style={{
          marginTop:     "8px",
          padding:       "10px 24px",
          background:    "rgba(238,162,58,0.15)",
          border:        "1px solid rgba(238,162,58,0.4)",
          borderRadius:  "8px",
          color:         "#b45309",
          fontWeight:    "600",
          fontSize:      "14px",
          cursor:        "pointer",
        }}
      >
        Go to My Dashboard
      </button>
    </div>
  );
}
