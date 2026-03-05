import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, User, LogOut, Camera, Lock, Eye, EyeOff, Save } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../DropdownMenu";
import Toast from "../Toast";

const PAGE_TITLES = {
  "/":         "Analytics Dashboard",
  "/books":    "Books",
  "/borrowed": "Borrowed",
};

export default function Topbar({ collapsed, onToggle, onMobileToggle }) {
  const location = useLocation();
  const title    = PAGE_TITLES[location.pathname] ?? "Dashboard";

  // Profile modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  
  // Profile form state
  const [profile, setProfile] = useState({
    username: "Admin",
    avatar: "https://i.pravatar.cc/36?img=12",
    password: "",
    confirmPassword: "",
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfile({ ...profile, avatar: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    // Add your save logic here
    console.log("Saving profile:", profile);
    setProfileModalOpen(false);
    setSuccessModalOpen(true);
  };

  const handleProfileClick = () => {
    setProfileModalOpen(true);
  };

  const handleCloseSuccessModal = () => {
    setSuccessModalOpen(false);
  };

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
        {/* Left: hamburger + page title */}
        <div className="flex items-center gap-3 min-w-0">

          {/* Desktop hamburger */}
          <button
            onClick={onToggle}
            aria-label="Toggle sidebar"
            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors duration-150"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(238,162,58,0.12)"; e.currentTarget.style.color = "#EEA23A"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={onMobileToggle}
            aria-label="Open menu"
            className="flex lg:hidden items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors duration-150"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(238,162,58,0.12)"; e.currentTarget.style.color = "#EEA23A"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <Menu size={20} />
          </button>

          <h1
            className="text-[15px] font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h1>
        </div>

        {/* Right: profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg select-none transition-colors duration-150 border-none bg-transparent cursor-pointer z-100"
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <img
              src="https://i.pravatar.cc/36?img=12"
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover shrink-0"
              style={{ border: "2px solid var(--accent-amber)" }}
            />
            <span
              className="hidden sm:block text-[13px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Admin
            </span>
            <ChevronDown
              size={14}
              style={{
                color: "var(--text-secondary)",
                transition: "transform 0.2s",
              }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleProfileClick}>
              <User size={14} className="mr-2" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem style={{ color: "#c0392b" }}>
              <LogOut size={14} className="mr-2" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Profile Modal */}
      {profileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,22,34,0.6)", backdropFilter: "blur(3px)" }}
          onClick={e => e.target === e.currentTarget && setProfileModalOpen(false)}
        >
          <div
            className="w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: "1px solid var(--border-light)" }}
            >
              <div className="flex items-center gap-2.5">
                <User size={20} style={{ color: "var(--accent-amber)" }} />
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  Edit Profile
                </h2>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(238,162,58,0.15)"; e.currentTarget.style.color = "#EEA23A"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <img
                    src={profile.avatar}
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
                  Click to change photo
                </p>
              </div>

              {/* Username Field */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Username
                </label>
                <div className="relative">
                  <User 
                    size={14} 
                    className="absolute left-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <input
                    type="text"
                    value={profile.username}
                    onChange={e => setProfile({ ...profile, username: e.target.value })}
                    className="w-full px-3 py-2 pl-8 rounded-lg text-[12px] border-[1.5px] outline-none transition-colors duration-150"
                    style={{
                      background: "var(--bg-input)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border)",
                      fontFamily: "inherit",
                    }}
                    onFocus={e => { e.target.style.borderColor = "#EEA23A"; e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.13)"; }}
                    onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                    placeholder="Enter username"
                  />
                </div>
              </div>

              {/* Password Section */}
              <div className="flex flex-col gap-2 pt-1" style={{ borderTop: "1px solid var(--border-light)" }}>
                <div className="flex items-center gap-1.5">
                  <Lock size={14} style={{ color: "var(--accent-amber)" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    Change Password
                  </span>
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    New Password
                  </label>
                  <div className="relative">
                    <Lock 
                      size={14} 
                      className="absolute left-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={profile.password}
                      onChange={e => setProfile({ ...profile, password: e.target.value })}
                      className="w-full px-3 py-2 pl-8 pr-8 rounded-lg text-[12px] border-[1.5px] outline-none transition-colors duration-150"
                      style={{
                        background: "var(--bg-input)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border)",
                        fontFamily: "inherit",
                      }}
                      onFocus={e => { e.target.style.borderColor = "#EEA23A"; e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.13)"; }}
                      onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock 
                      size={14} 
                      className="absolute left-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={profile.confirmPassword}
                      onChange={e => setProfile({ ...profile, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 pl-8 pr-8 rounded-lg text-[12px] border-[1.5px] outline-none transition-colors duration-150"
                      style={{
                        background: "var(--bg-input)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border)",
                        fontFamily: "inherit",
                      }}
                      onFocus={e => { e.target.style.borderColor = "#EEA23A"; e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.13)"; }}
                      onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Password mismatch warning */}
                {profile.password && profile.confirmPassword && profile.password !== profile.confirmPassword && (
                  <p className="text-[10px]" style={{ color: "#dc2626" }}>
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex justify-end gap-2.5 px-6 py-4 shrink-0"
              style={{ borderTop: "1px solid var(--border-light)" }}
            >
              <button
                onClick={() => setProfileModalOpen(false)}
                className="px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors duration-150"
                style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1.5px solid var(--border)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--bg-surface)"}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-colors duration-150"
                style={{ background: "var(--accent-amber)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--accent-orange)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--accent-amber)"}
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      <Toast
        message="Profile updated successfully!"
        type="success"
        isVisible={successModalOpen}
        onClose={handleCloseSuccessModal}
      />
    </>
  );
}

