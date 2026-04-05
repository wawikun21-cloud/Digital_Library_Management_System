import { useState, useEffect } from 'react';
import { Search, Clock, ArrowRight, ArrowLeft, Trash2, Users, Calendar, AlertCircle } from 'lucide-react';
import { 
  getAllAttendance, 
  getActiveAttendance, 
  getAttendanceStats, 
  checkIn, 
  checkOut, 
  deleteAttendance 
} from '../services/api/attendanceApi';
import { getStudentByStudentIdNumber } from '../services/api/studentsApi';
import StatsCard from '../components/StatsCard';
import Toast from '../components/Toast';
import useDebounce from '../hooks/useDebounce';

// ─────────────────────────────────────────────────────────
//  Attendance Page
//  Main page for tracking student attendance in the library
// ─────────────────────────────────────────────────────────

// ── Live duration display that ticks every second ────────
function LiveDuration({ checkInTime }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(checkInTime).getTime()) / 1000)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(checkInTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [checkInTime]);

  const hours   = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm font-medium text-amber-600 dark:text-amber-400">
      <Clock className="w-3.5 h-3.5 animate-pulse" />
      {hours > 0
        ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(minutes)}:${pad(seconds)}`}
    </span>
  );
}

export default function Attendance() {
  // ── State management ──────────────────────────────────
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [activeStudents, setActiveStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Check-in form state ───────────────────────────────
  const [checkInForm, setCheckInForm] = useState({
    student_id_number: ''
  });
  const [studentDetails, setStudentDetails] = useState(null);
  const [isLookingUpStudent, setIsLookingUpStudent] = useState(false);
  const debouncedStudentId = useDebounce(checkInForm.student_id_number, 500);

  // ── Toast state ───────────────────────────────────────
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  // ── Fetch attendance data ─────────────────────────────
  const fetchAttendanceData = async () => {
    setIsLoading(true);
    try {
      const [recordsResponse, activeResponse, statsResponse] = await Promise.all([
        getAllAttendance(),
        getActiveAttendance(),
        getAttendanceStats()
      ]);

      if (recordsResponse.success) {
        setAttendanceRecords(recordsResponse.data);
      }

      if (activeResponse.success) {
        setActiveStudents(activeResponse.data);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      showToast('Failed to fetch attendance data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Show toast notification ───────────────────────────
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  // ── Handle check-in ───────────────────────────────────
  const handleCheckIn = async (e) => {
    e.preventDefault();

    if (!checkInForm.student_id_number) {
      showToast('Please enter student ID number', 'error');
      return;
    }

    if (!studentDetails) {
      showToast('Student does not exist', 'error');
      return;
    }

    try {
      const response = await checkIn(checkInForm);
      if (response.success) {
        showToast('Student checked in successfully');
        setCheckInForm({ student_id_number: '' });
        setStudentDetails(null);
        fetchAttendanceData();
      } else {
        showToast(response.error, 'error');
      }
    } catch (error) {
      showToast('Failed to check in student', 'error');
    }
  };

  // ── Handle check-out ──────────────────────────────────
  const handleCheckOut = async (studentIdNumber) => {
    try {
      const response = await checkOut(studentIdNumber);
      if (response.success) {
        showToast('Student checked out successfully');
        fetchAttendanceData();
      } else {
        showToast(response.error, 'error');
      }
    } catch (error) {
      showToast('Failed to check out student', 'error');
    }
  };

  // ── Handle delete attendance record ───────────────────
  const handleDeleteAttendance = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    try {
      const response = await deleteAttendance(id);
      if (response.success) {
        showToast('Attendance record deleted successfully');
        fetchAttendanceData();
      } else {
        showToast(response.error, 'error');
      }
    } catch (error) {
      showToast('Failed to delete attendance record', 'error');
    }
  };

  // ── Filter attendance records ─────────────────────────
  const filteredRecords = attendanceRecords.filter(record =>
    record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.student_id_number.includes(searchTerm) ||
    (record.student_course && record.student_course.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ── Format duration (for completed history records) ───
  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins  = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // ── Format date/time ──────────────────────────────────
  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month:  '2-digit',
      day:    '2-digit',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit'
    });
  };

  // ── Initialize data ───────────────────────────────────
  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // ── Look up student details when student ID changes ──
  useEffect(() => {
    const lookupStudent = async () => {
      if (!debouncedStudentId || debouncedStudentId.trim() === '') {
        setStudentDetails(null);
        return;
      }

      setIsLookingUpStudent(true);
      try {
        const response = await getStudentByStudentIdNumber(debouncedStudentId);
        if (response.success) {
          setStudentDetails(response.data);
        } else {
          setStudentDetails(null);
        }
      } catch (error) {
        console.error('Error looking up student:', error);
        setStudentDetails(null);
      } finally {
        setIsLookingUpStudent(false);
      }
    };

    lookupStudent();
  }, [debouncedStudentId]);

  return (
    <div className="p-6">
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-amber-500" />
            Attendance Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Track student check-in/check-out and library visit duration
          </p>
        </div>
      </div>

      {/* ── Statistics Cards ──────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Visits"
            value={stats.total}
            icon={Calendar}
            color="blue"
          />
          <StatsCard
            title="Currently In Library"
            value={stats.active}
            icon={Clock}
            color="green"
          />
          <StatsCard
            title="Total Hours"
            value={`${Math.round(stats.totalDuration / 60)}h`}
            icon={Clock}
            color="amber"
          />
          <StatsCard
            title="Checked Out"
            value={stats.checkedOut}
            icon={ArrowLeft}
            color="purple"
          />
        </div>
      )}

      {/* ── Check-in Form ─────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Check In Student
        </h2>
        <form onSubmit={handleCheckIn} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Student ID Number
            </label>
            <input
              type="text"
              required
              value={checkInForm.student_id_number}
              onChange={(e) => setCheckInForm({ ...checkInForm, student_id_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Enter student ID number"
            />
            {isLookingUpStudent && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Looking up student...
              </p>
            )}
            {studentDetails && !isLookingUpStudent && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {studentDetails.display_name || studentDetails.student_name}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {studentDetails.student_course && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {studentDetails.student_course}
                    </span>
                  )}
                  {studentDetails.student_yr_level && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      {studentDetails.student_yr_level.toLowerCase().includes('year')
                        ? studentDetails.student_yr_level
                        : `Year ${studentDetails.student_yr_level}`}
                    </span>
                  )}
                </div>
              </div>
            )}
            {!studentDetails && !isLookingUpStudent && checkInForm.student_id_number.trim() !== '' && (
              <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                Student does not exist
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              &nbsp;
            </label>
            <button
              type="submit"
              disabled={!studentDetails}
              className={`w-full px-6 py-2 font-semibold rounded-md transition-colors duration-200 flex items-center gap-2 ${
                studentDetails
                  ? 'bg-amber-500 hover:bg-amber-600 text-gray-900 dark:text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              Check In
            </button>
          </div>
        </form>
      </div>

      {/* ── Currently Active Students ─────────────────────── */}
      {activeStudents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Currently In Library ({activeStudents.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Student
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Student ID
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Course
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Check In Time
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Duration
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeStudents.map((student) => (
                  <tr key={student.id} className="border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-3 text-sm text-gray-800 dark:text-white">
                      {student.student_name}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-800 dark:text-white">
                      {student.student_id_number}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-800 dark:text-white">
                      {student.student_course || 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-800 dark:text-white">
                      {formatDateTime(student.check_in_time)}
                    </td>
                    <td className="py-3 px-3">
                      {/* Live ticking counter per student */}
                      <LiveDuration checkInTime={student.check_in_time} />
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleCheckOut(student.student_id_number)}
                        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Check Out
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Attendance History ─────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Attendance History
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search attendance..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading attendance records...</span>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Student
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Student ID
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Course
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Check In
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Check Out
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Duration
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-3 text-sm text-gray-800 dark:text-white">
                      {record.student_name}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-800 dark:text-white">
                      {record.student_id_number}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-800 dark:text-white">
                      {record.student_course || 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-800 dark:text-white">
                      {formatDateTime(record.check_in_time)}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-800 dark:text-white">
                      {record.check_out_time ? formatDateTime(record.check_out_time) : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-800 dark:text-white">
                      {/* Live counter for still-active records, static for completed ones */}
                      {record.status === 'checked_in'
                        ? <LiveDuration checkInTime={record.check_in_time} />
                        : formatDuration(record.duration)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'checked_in'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                      }`}>
                        {record.status === 'checked_in' ? 'Checked In' : 'Checked Out'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleDeleteAttendance(record.id)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {searchTerm ? 'No matching attendance records found' : 'No attendance records available'}
            </p>
          </div>
        )}
      </div>

      {/* ── Toast Notification ─────────────────────────────── */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  );
}