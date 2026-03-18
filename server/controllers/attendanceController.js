// ─────────────────────────────────────────────────────────
//  controllers/attendanceController.js
//  Attendance Controller - API endpoints for attendance tracking
// ─────────────────────────────────────────────────────────

const AttendanceModel = require("../models/Attendance");

const AttendanceController = {
  /**
   * Get all attendance records
   */
  async getAllAttendance(req, res) {
    try {
      const result = await AttendanceModel.getAll();
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Attendance records retrieved successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[AttendanceController.getAllAttendance] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Get active attendance records (checked in)
   */
  async getActiveAttendance(req, res) {
    try {
      const result = await AttendanceModel.getActiveAttendance();
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Active attendance records retrieved successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[AttendanceController.getActiveAttendance] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Get attendance by student ID
   */
  async getAttendanceByStudentId(req, res) {
    try {
      const { studentIdNumber } = req.params;
      const result = await AttendanceModel.getByStudentId(studentIdNumber);
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Student attendance records retrieved successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[AttendanceController.getAttendanceByStudentId] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Check in a student
   */
  async checkIn(req, res) {
    try {
      const attendanceData = req.body;
      const result = await AttendanceModel.checkIn(attendanceData);
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: "Student checked in successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[AttendanceController.checkIn] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Check out a student
   */
  async checkOut(req, res) {
    try {
      const { studentIdNumber } = req.params;
      const result = await AttendanceModel.checkOut(studentIdNumber);
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Student checked out successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[AttendanceController.checkOut] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Get attendance statistics
   */
  async getAttendanceStats(req, res) {
    try {
      const result = await AttendanceModel.getStats();
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Attendance statistics retrieved successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[AttendanceController.getAttendanceStats] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Delete an attendance record
   */
  async deleteAttendance(req, res) {
    try {
      const { id } = req.params;
      const result = await AttendanceModel.delete(id);
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Attendance record deleted successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[AttendanceController.deleteAttendance] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  }
};

module.exports = AttendanceController;
