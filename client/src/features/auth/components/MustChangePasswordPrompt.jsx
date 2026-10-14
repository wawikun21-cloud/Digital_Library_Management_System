import { useState } from "react";
import { KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { useChangePassword } from "../hooks/useChangePassword";

/**
 * First-login prompt for students created with default credentials
 * (username = password = student ID). Shown until the password is
 * changed; the server clears must_change_password on success.
 */
export default function MustChangePasswordPrompt({ user, onDismiss }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { changePassword, saving, error, setError } = useChangePassword({ onChanged: onDismiss });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await changePassword({ password, confirmPassword });
    if (ok) {
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,34,0.66)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="must-change-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "var(--bg-surface)", border: "1.5px solid var(--border)", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "rgba(238,162,58,0.14)", color: "var(--accent-amber)" }}
          >
            <ShieldAlert size={18} />
          </div>
          <div>
            <h2 id="must-change-title" className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>
              Change your password
            </h2>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              Your account still uses its default password.
            </p>
          </div>
        </div>

        <p className="mb-4 rounded-lg px-3 py-2 text-[12px]" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
          Your current password is your <strong>student ID number</strong>. Choose a new one before continuing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rp-callout rp-callout--danger" role="alert">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              New Password
            </label>
            <div className="relative">
              <KeyRound
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="rp-field px-3 py-2.5 pl-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              placeholder="Repeat the new password"
              autoComplete="new-password"
              className="rp-field px-3 py-2.5 text-sm"
            />
          </div>

          <button type="submit" disabled={saving} className="rp-btn rp-btn--primary w-full justify-center">
            {saving ? (
              <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Saving…</>
            ) : (
              "Change Password"
            )}
          </button>

          <p className="text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
            Signed in as {user?.username || "student"}
          </p>
        </form>
      </div>
    </div>
  );
}
