import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, User, LogOut, Camera, Lock, Eye, EyeOff, Save, X, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../DropdownMenu";
import Toast from "../Toast";
import authApi from "../../services/api/authApi";

const PAGE_TITLES = {
  "/":         "Analytics Dashboard",
  "/books":    "Books",
  "/borrowed": "Borrowed",
  "/deleted":  "Recently Deleted",
};

/** Read the cached user from session/localStorage (set during login) */
function getCachedUser() {
  try {
    const s = sessionStorage.getItem("lexora_user") || localStorage.getItem("lexora_user");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

/** Persist updated user to whichever storage had it */
function updateCachedUser(user) {
  try {
    if (sessionStorage.getItem("lexora_user")) {
      sessionStorage.setItem("lexora_user", JSON.stringify(user));
    }
    if (localStorage.getItem("lexora_user")) {
      localStorage.setItem("lexora_user", JSON.stringify(user));
    }
  } catch {
    // ignore
  }
}

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const title    = PAGE_TITLES[location.pathname] ?? "Dashboard";

  // ── Session user ─────────────────────────────────────
  const [sessionUser, setSessionUser] = useState(getCachedUser);

  useEffect(() => {
    authApi.me()
      .then(({ user }) => setSessionUser(user))
      .catch(() => {
        sessionStorage.removeItem("lexora_user");
        localStorage.removeItem("lexora_user");
        navigate("/", { replace: true });
      });
  }, []);

  // ── Logout ────────────────────────────────────────────
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // clear local state regardless
    } finally {
      sessionStorage.removeItem("lexora_user");
      localStorage.removeItem("lexora_user");
      navigate("/", { replace: true });
    }
  };

  // ── Profile modal ─────────────────────────────────────
  const [profileModalOpen,    setProfileModalOpen]    = useState(false);
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileError,        setProfileError]        = useState("");
  const [saving,              setSaving]              = useState(false);
  const [toastMsg,            setToastMsg]            = useState("");
  const [toastType,           setToastType]           = useState("success");
  const [toastVisible,        setToastVisible]        = useState(false);
  const fileInputRef = useRef(null);

  // avatarFile: the raw File chosen (to send to API)
  // avatarPreview: data-URL for instant visual preview
  const [avatarFile,    setAvatarFile]    = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [profile, setProfile] = useState({
    username:        sessionUser?.username || "Admin",
    password:        "",
    confirmPassword: "",
  });

  // Keep username in sync if session loads after mount
  useEffect(() => {
    if (sessionUser?.username) {
      setProfile(p => ({ ...p, username: sessionUser.username }));
    }
  }, [sessionUser?.username]);

  const showToast = (msg, type = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const handleAvatarClick  = () => fileInputRef.current?.click();
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    // Instant preview via FileReader
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
    // Reset input so selecting the same file again triggers onChange
    e.target.value = "";
  };

  const handleOpenModal = () => {
    // Reset transient state every time the modal opens
    setProfile({ username: sessionUser?.username || "Admin", password: "", confirmPassword: "" });
    setAvatarFile(null);
    setAvatarPreview(null);
    setProfileError("");
    setProfileModalOpen(true);
  };

  const handleCloseModal = () => {
    setProfileModalOpen(false);
    setProfileError("");
  };

  const handleSaveProfile = async () => {
    setProfileError("");

    // ── Client-side validation ───────────────────────────
    const trimmedUsername = profile.username.trim();
    if (!trimmedUsername) {
      setProfileError("Username cannot be empty");
      return;
    }
    if (trimmedUsername.length < 3) {
      setProfileError("Username must be at least 3 characters");
      return;
    }
    if (profile.password && profile.password.length < 6) {
      setProfileError("Password must be at least 6 characters");
      return;
    }
    if (profile.password && profile.password !== profile.confirmPassword) {
      setProfileError("Passwords do not match");
      return;
    }

    // ── Nothing actually changed? ────────────────────────
    const usernameChanged = trimmedUsername !== sessionUser?.username;
    const passwordChanged = !!profile.password;
    const avatarChanged   = !!avatarFile;

    if (!usernameChanged && !passwordChanged && !avatarChanged) {
      handleCloseModal();
      return;
    }

    setSaving(true);
    try {
      const { user } = await authApi.updateProfile({
        username:        usernameChanged ? trimmedUsername   : undefined,
        password:        passwordChanged ? profile.password : undefined,
        confirmPassword: passwordChanged ? profile.confirmPassword : undefined,
        avatarFile:      avatarChanged   ? avatarFile        : undefined,
      });

      // Update local state + storage
      setSessionUser(user);
      updateCachedUser(user);

      // Clear avatar preview state (real URL is now in user.avatar_url)
      setAvatarFile(null);
      setAvatarPreview(null);

      handleCloseModal();
      showToast("Profile updated successfully!");
    } catch (err) {
      setProfileError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived display values ────────────────────────────
  const displayName = sessionUser?.username || "Admin";

  // Priority: live preview > saved avatar_url from DB > fallback initials avatar
  const avatarSrc = avatarPreview
    || sessionUser?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=EEA23A&color=fff`;

  // Preview inside the modal (same logic but prefers the new pick)
  const modalAvatarSrc = avatarPreview
    || sessionUser?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || displayName)}&background=EEA23A&color=fff`;

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between h-[58px] px-4 sm:px-6"
        style={{
          background:   "var(--bg-topbar)",
          borderBottom: "1px solid var(--border)",
          boxShadow:    "0 1px 4px rgba(19,47,69,0.07)",
          transition:   "background 0.3s, border-color 0.3s",
        }}
      >
        {/* Left: page title */}
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-[15px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {title}
          </h1>
        </div>

        {/* Right: profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg select-none transition-colors duration-150 border-none bg-transparent cursor-pointer"
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <img
              src={avatarSrc}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover shrink-0"
              style={{ border: "2px solid var(--accent-amber)" }}
            />
            <span className="hidden sm:block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {displayName}
            </span>
            <ChevronDown size={14} style={{ color: "var(--text-secondary)", transition: "transform 0.2s" }} />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44">
            {/* User info header */}
            <div className="px-3 py-2 mb-1" style={{ borderBottom: "1px solid var(--border-light)" }}>
              <p className="text-[11px] font-bold truncate" style={{ color: "var(--text-primary)" }}>
                {displayName}
              </p>
              <p className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>
                {sessionUser?.role || "Administrator"}
              </p>
            </div>

            <DropdownMenuItem onClick={handleOpenModal}>
              <User size={14} className="mr-2" />
              <span>Edit Profile</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              disabled={loggingOut}
              style={{ color: "#c0392b", opacity: loggingOut ? 0.6 : 1 }}
            >
              {loggingOut
                ? <Loader2 size={14} className="mr-2 animate-spin" />
                : <LogOut  size={14} className="mr-2" />
              }
              <span>{loggingOut ? "Logging out…" : "Logout"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ── Profile Modal ──────────────────────────────────── */}
      {profileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,22,34,0.6)", backdropFilter: "blur(3px)" }}
          onClick={e => e.target === e.currentTarget && handleCloseModal()}
        >
          <div
            className="w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0"
                 style={{ borderBottom: "1px solid var(--border-light)" }}>
              <div className="flex items-center gap-2.5">
                <User size={20} style={{ color: "var(--accent-amber)" }} />
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Edit Profile</h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(238,162,58,0.15)"; e.currentTarget.style.color = "#EEA23A"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-hover)";        e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

              {/* Avatar */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <img
                    src={modalAvatarSrc}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
                    style={{ border: "3px solid var(--accent-amber)" }}
                  />
                  <button
                    onClick={handleAvatarClick}
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-150"
                    style={{ background: "var(--accent-amber)", color: "#fff" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--accent-orange)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--accent-amber)"}
                    title="Change avatar"
                  >
                    <Camera size={12} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {avatarFile ? `Selected: ${avatarFile.name}` : "Click to change photo (max 1 MB)"}
                </p>
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Username
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    value={profile.username}
                    onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                    className="w-full px-3 py-2 pl-8 rounded-lg text-[12px] border-[1.5px] outline-none transition-colors duration-150"
                    style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border)", fontFamily: "inherit" }}
                    onFocus={e => { e.target.style.borderColor = "#EEA23A"; e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.13)"; }}
                    onBlur={e =>  { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                    placeholder="Enter username"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Change Password */}
              <div className="flex flex-col gap-2 pt-1" style={{ borderTop: "1px solid var(--border-light)" }}>
                <div className="flex items-center gap-1.5">
                  <Lock size={14} style={{ color: "var(--accent-amber)" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>Change Password</span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>(leave blank to keep current)</span>
                </div>

                {/* New password */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    New Password
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={profile.password}
                      onChange={e => setProfile(p => ({ ...p, password: e.target.value }))}
                      className="w-full px-3 py-2 pl-8 pr-8 rounded-lg text-[12px] border-[1.5px] outline-none transition-colors duration-150"
                      style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border)", fontFamily: "inherit" }}
                      onFocus={e => { e.target.style.borderColor = "#EEA23A"; e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.13)"; }}
                      onBlur={e =>  { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                      placeholder="Enter new password"
                      disabled={saving}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={profile.confirmPassword}
                      onChange={e => setProfile(p => ({ ...p, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 pl-8 pr-8 rounded-lg text-[12px] border-[1.5px] outline-none transition-colors duration-150"
                      style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border)", fontFamily: "inherit" }}
                      onFocus={e => { e.target.style.borderColor = "#EEA23A"; e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.13)"; }}
                      onBlur={e =>  { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                      placeholder="Confirm new password"
                      disabled={saving}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Live mismatch hint */}
                {!profileError && profile.password && profile.confirmPassword && profile.password !== profile.confirmPassword && (
                  <p className="text-[10px]" style={{ color: "#dc2626" }}>Passwords do not match</p>
                )}

                {/* Server / validation error */}
                {profileError && (
                  <p className="text-[10px]" style={{ color: "#dc2626" }}>{profileError}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2.5 px-6 py-4 shrink-0"
                 style={{ borderTop: "1px solid var(--border-light)" }}>
              <button
                onClick={handleCloseModal}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors duration-150"
                style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1.5px solid var(--border)", opacity: saving ? 0.5 : 1 }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => e.currentTarget.style.background = "var(--bg-surface)"}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-colors duration-150"
                style={{ background: "var(--accent-amber)", opacity: saving ? 0.7 : 1 }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "var(--accent-orange)"; }}
                onMouseLeave={e => e.currentTarget.style.background = "var(--accent-amber)"}
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><Save size={14} /> Save Changes</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success / error Toast */}
      <Toast
        message={toastMsg}
        type={toastType}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </>
  );
}