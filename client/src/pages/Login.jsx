import { useState } from "react";
import { Eye, EyeOff, BookOpen, Loader2 } from "lucide-react";

/**
 * Login Page - UI/UX Design Only
 * Lexora Library Management System
 */

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!formData.password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);
    
    // Simulate login delay (UI demo only)
    setTimeout(() => {
      setIsLoading(false);
      // Demo: show error for any input
      setError("Demo mode: No backend connected yet");
    }, 1500);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #132F45 0%, #1a4a63 50%, #32667F 100%)",
      }}
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Floating Shapes */}
      <div
        className="absolute w-64 h-64 rounded-full opacity-20 animate-pulse"
        style={{
          background: "radial-gradient(circle, #EEA23A 0%, transparent 70%)",
          top: "10%",
          left: "5%",
        }}
      />
      <div
        className="absolute w-96 h-96 rounded-full opacity-15 animate-pulse"
        style={{
          background: "radial-gradient(circle, #32667F 0%, transparent 70%)",
          bottom: "5%",
          right: "10%",
          animationDelay: "1s",
        }}
      />

      {/* Login Card */}
      <div
        className="relative w-full max-w-md animate-in fade-in zoom-in duration-300"
        style={{
          animationDelay: "0.1s",
        }}
      >
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "var(--bg-surface, #ffffff)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* Header */}
          <div
            className="px-8 pt-10 pb-8 text-center"
            style={{
              background: "linear-gradient(180deg, rgba(238,162,58,0.08) 0%, transparent 100%)",
            }}
          >
            {/* Logo */}
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 mx-auto"
              style={{
                background: "linear-gradient(135deg, #EEA23A 0%, #EA8B33 100%)",
                boxShadow: "0 8px 20px rgba(238,162,58,0.35)",
              }}
            >
              <BookOpen size={32} className="text-white" />
            </div>

            <h1
              className="text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary, #1a1a1a)" }}
            >
              Welcome to Lexora
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--text-secondary, #666666)" }}
            >
              Sign in to access your library
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-8">
            {/* Error Message */}
            {error && (
              <div
                className="mb-5 px-4 py-3 rounded-xl text-sm font-medium animate-in slide-in-from-top duration-200"
                style={{
                  background: "rgba(220,38,38,0.1)",
                  border: "1px solid rgba(220,38,38,0.2)",
                  color: "#dc2626",
                }}
              >
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="mb-5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold mb-2"
                style={{ color: "var(--text-secondary, #666666)" }}
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@lexora.com"
                  className="w-full px-4 py-3 text-sm rounded-xl border outline-none transition-all duration-200"
                  style={{
                    background: "var(--bg-input, #f3f4f6)",
                    borderColor: "var(--border, #e5e5e5)",
                    color: "var(--text-primary, #1a1a1a)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#EEA23A";
                    e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border, #e5e5e5)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold mb-2"
                style={{ color: "var(--text-secondary, #666666)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 text-sm rounded-xl border outline-none transition-all duration-200"
                  style={{
                    background: "var(--bg-input, #f3f4f6)",
                    borderColor: "var(--border, #e5e5e5)",
                    color: "var(--text-primary, #1a1a1a)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#EEA23A";
                    e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border, #e5e5e5)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors duration-150"
                  style={{ color: "var(--text-muted, #999999)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#EEA23A")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted, #999999)")}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-2 transition-all duration-150"
                  style={{
                    accentColor: "#EEA23A",
                    borderColor: "var(--border, #e5e5e5)",
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--text-secondary, #666666)" }}
                >
                  Remember me
                </span>
              </label>
              <a
                href="#"
                className="text-xs font-semibold transition-colors duration-150 hover:underline"
                style={{ color: "#EEA23A" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#EA8B33")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#EEA23A")}
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #EEA23A 0%, #EA8B33 100%)",
                boxShadow: "0 4px 15px rgba(238,162,58,0.35)",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 25px rgba(238,162,58,0.45)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(238,162,58,0.35)";
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <div
            className="px-8 py-4 text-center"
            style={{
              borderTop: "1px solid var(--border-light, #f3f4f6)",
              background: "var(--bg-subtle, #f9fafb)",
            }}
          >
            <p
              className="text-xs"
              style={{ color: "var(--text-muted, #999999)" }}
            >
              © 2026 Lexora Library Management
            </p>
          </div>
        </div> 
      </div>
    </div>
  );
}

