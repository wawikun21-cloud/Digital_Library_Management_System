/**
 * features/auth/pages/UnauthorizedPage.jsx
 *
 * Shown when a user tries to access a route outside their role.
 *
 * This page was already compliant (83 lines, composition only) — moved
 * verbatim from pages/Unauthorized.jsx so both auth-domain screens live
 * together in the feature.
 *
 * The "Go to My Dashboard" target now comes from getLandingRoute(user),
 * which honors the user's permissions and school license, instead of a
 * raw role→route lookup that could ignore a denied surface.
 */

import { useNavigate, useLocation } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { useLocalStorage } from "../../../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../../../constants/index.js";
import { getLandingRoute } from "../../../utils/permissionUtils";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user]   = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);

  // Detect ?reason=license → school license doesn't cover this surface.
  const isLicenseDenied = new URLSearchParams(location.search).get("reason") === "license";

  // getLandingRoute resolves the reachable home from the user's permissions
  // and school license. When nothing is reachable it returns this page's own
  // route, so fall back to /login instead of linking to ourselves.
  const fallback = getLandingRoute(user);
  const goTo = fallback === "/dashboard/unauthorized" ? "/login" : fallback;

  const handleGoBack = () => {
    navigate(goTo, { replace: true });
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
         {isLicenseDenied ? "License Restricted" : "Access Denied"}
       </h1>

       <p style={{
         fontSize:  "15px",
         color:     "var(--text-secondary, #6b7280)",
         maxWidth:  "340px",
         lineHeight: 1.6,
         margin:    0,
       }}>
         {isLicenseDenied
           ? "Your school's license does not cover this feature. The physical library and attendance tools are not included in your current license tier."
           : "You don't have permission to view this page. Please contact your administrator if you think this is a mistake."}
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
