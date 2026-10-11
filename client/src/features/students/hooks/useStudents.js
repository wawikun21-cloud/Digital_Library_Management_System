/**
 * features/students/hooks/useStudents.js
 *
 * Student list + stats + CRUD. Extracted from the component body of the
 * former pages/Students.jsx, including the local + server duplicate-ID
 * checks on create.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  checkStudentIdExists,
} from "../../../services/api/studentsApi";

export function useStudents({ showToast }) {
  const [students, setStudents]   = useState([]);
  const [stats, setStats]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsResponse, statsResponse] = await Promise.all([
        getAllStudents(),
        getStudentStats(),
      ]);

      if (studentsResponse.success) {
        setStudents(studentsResponse.data);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error("Error fetching students data:", error);
      showToast("Failed to fetch students data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /**
   * Create a student.
   * @returns {Promise<"created"|"duplicate"|"failed">}
   */
  const createMember = useCallback(async (formData) => {
    try {
      const trimmedId = (formData.student_id_number || "").trim();

      if (!trimmedId) {
        showToast("Student ID number is required", "error");
        return "failed";
      }

      // Client-side duplicate check against currently loaded students (fast feedback)
      const duplicateLocal = students.some(
        s => String(s.student_id_number).trim() === trimmedId
      );
      if (duplicateLocal) {
        showToast(`Student ID "${trimmedId}" already exists. Cannot add duplicate.`, "error");
        return "duplicate";
      }

      // Server-side duplicate check (authoritative)
      const checkResult = await checkStudentIdExists(trimmedId);
      if (checkResult.exists) {
        showToast(`Student ID "${trimmedId}" already exists. Cannot add duplicate.`, "error");
        return "duplicate";
      }

      const response = await createStudent(formData);
      if (response.success) {
        showToast("Student created successfully");
        fetchData();
        return "created";
      }
      showToast(response.error, "error");
      return "failed";
    } catch (error) {
      showToast("Failed to create student", "error");
      return "failed";
    }
  }, [students, showToast, fetchData]);

  const updateMember = useCallback(async (id, formData) => {
    try {
      const response = await updateStudent(id, formData);
      if (response.success) {
        showToast("Student updated successfully");
        fetchData();
        return true;
      }
      showToast(response.error, "error");
      return false;
    } catch (error) {
      showToast("Failed to update student", "error");
      return false;
    }
  }, [showToast, fetchData]);

  const deleteMember = useCallback(async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return;
    }
    try {
      const response = await deleteStudent(studentId);
      if (response.success) {
        showToast("Student deleted successfully");
        fetchData();
      } else {
        showToast(response.error, "error");
      }
    } catch (error) {
      showToast("Failed to delete student", "error");
    }
  }, [showToast, fetchData]);

  /** On-blur duplicate check for the form's ID field. */
  const checkIdExists = useCallback(async (idNumber) => {
    if (!idNumber || idNumber.trim() === "") return false;
    const result = await checkStudentIdExists(idNumber);
    return result.exists || false;
  }, []);

  return {
    students, stats, isLoading,
    fetchData, createMember, updateMember, deleteMember, checkIdExists,
  };
}
