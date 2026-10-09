import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { fetchCurrentUser } from "../../users/api/usersApi";

export function useStudentPortal() {
  const { user, role, isStudent } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkAccess = useCallback(async () => {
    if (!isStudent) {
      navigate("/");
      return;
    }

    try {
      const res = await fetchCurrentUser();
      if (res.success) {
        setProfile(res.data);
      } else {
        navigate("/login");
      }
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [isStudent, navigate]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const displayName = profile?.full_name || user?.username || "Student";

  return {
    user,
    role,
    profile,
    loading,
    displayName,
    isStudent,
  };
}
