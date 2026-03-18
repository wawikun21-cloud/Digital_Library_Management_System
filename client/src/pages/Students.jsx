import { useState, useEffect, useRef } from 'react';
import {
  Search, Upload, FileSpreadsheet, Download, Plus, Edit,
  Trash2, User, Mail, Phone, Building2, GraduationCap, AlertCircle,
  CheckCircle2, XCircle, FileText, ChevronDown
} from 'lucide-react';
import {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
  getStudentStats
} from '../services/api/studentsApi';
import StatsCard from '../components/StatsCard';
import Toast from '../components/Toast';

// ─────────────────────────────────────────────────────────
//  Students Page
//  Manage student details and bulk import functionality
// ─────────────────────────────────────────────────────────

export default function Students() {
  // ── State management ──────────────────────────────────
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Modals and forms ─────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({
    student_id_number: '',
    student_name: '',
    student_course: '',
    student_yr_level: '',
    student_email: '',
    student_contact: '',
    display_name: '',
    first_name: '',
    last_name: ''
  });

  // ── Bulk import state ────────────────────────────────
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [parsedStudentsData, setParsedStudentsData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // ── Toast state ─────────────────────────────────────
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  // ── Filter state ────────────────────────────────────
  const [filters, setFilters] = useState({
    course: 'All',
    yearLevel: 'All'
  });

  // ── Fetch students data ─────────────────────────────
  const fetchStudentsData = async () => {
    setIsLoading(true);
    try {
      const [studentsResponse, statsResponse] = await Promise.all([
        getAllStudents(),
        getStudentStats()
      ]);

      if (studentsResponse.success) {
        setStudents(studentsResponse.data);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching students data:', error);
      showToast('Failed to fetch students data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Show toast notification ─────────────────────────
  const showToast = (message, type = 'success') => {
    setToast({
      show: true,
      message,
      type
    });
  };

  // ── Handle file upload for bulk import ──────────────
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        showToast('Please select a valid Excel file', 'error');
        return;
      }
      setImportFile(file);
      parseExcelFile(file); // Automatically parse and show preview when file is selected
    }
  };

  // ── Parse Excel file using SheetJS ──────────────────
  const parseExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Read all sheets in the workbook
        let allStudentsData = [];
        for (let sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Map Excel columns to our student fields
          const studentsData = jsonData.map(row => {
            // Extract first and last name from Display Name or separate fields
            let studentName = row['Display Name'] || row['display_name'] || '';
            if (!studentName) {
              const firstName = row['First Name'] || row['first_name'] || '';
              const lastName = row['Last Name'] || row['last_name'] || '';
              studentName = `${firstName} ${lastName}`.trim();
            }

            // Try to extract year level from sheet name (supports: "1st Year", "First Year", "Sheet1", "1" etc.)
            let yearLevel = '';
            const sheetNameLower = sheetName.toLowerCase();
            
            // Try to extract numeric year from sheet name
            const numericMatch = sheetNameLower.match(/(\d+)/);
            if (numericMatch) {
              const sheetNumber = parseInt(numericMatch[1]);
              if (sheetNumber === 1) {
                yearLevel = '1st Year';
              } else if (sheetNumber === 2) {
                yearLevel = '2nd Year';
              } else if (sheetNumber === 3) {
                yearLevel = '3rd Year';
              } else if (sheetNumber === 4) {
                yearLevel = '4th Year';
              }
            }
            
            // Fallback to existing text-based detection
            if (!yearLevel) {
              if (sheetNameLower.includes('1st') || sheetNameLower.includes('first')) {
                yearLevel = '1st Year';
              } else if (sheetNameLower.includes('2nd') || sheetNameLower.includes('second')) {
                yearLevel = '2nd Year';
              } else if (sheetNameLower.includes('3rd') || sheetNameLower.includes('third')) {
                yearLevel = '3rd Year';
              } else if (sheetNameLower.includes('4th') || sheetNameLower.includes('fourth')) {
                yearLevel = '4th Year';
              }
            }

            return {
              student_id_number: row['Username'] || row['username'] || '',
              student_name: studentName,
              student_course: '', // Empty since not provided in the Excel file
              student_yr_level: yearLevel, // Get from sheet name
              student_email: row['Email'] || row['email'] || '',
              student_contact: '', // Empty since not provided in the Excel file
              display_name: row['Display Name'] || row['display_name'] || '',
              first_name: row['First Name'] || row['first_name'] || '',
              last_name: row['Last Name'] || row['last_name'] || ''
            };
          }).filter(student => student.student_id_number && student.student_name);

          allStudentsData = [...allStudentsData, ...studentsData];
        }

        if (allStudentsData.length > 0) {
          setParsedStudentsData(allStudentsData);
          showToast(`Successfully parsed ${allStudentsData.length} students from Excel file`, 'success');
        } else {
          showToast('No valid student data found in the Excel file', 'error');
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        showToast('Failed to parse Excel file', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Handle bulk import ───────────────────────────────
  const handleBulkImport = async (studentsData) => {
    try {
      const response = await bulkImportStudents(studentsData);
      if (response.success) {
        setImportResult(response.data);
        setParsedStudentsData(null); // Clear parsed data
        showToast(`Successfully imported ${response.data.successful} students`, 'success');
        if (response.data.failed > 0) {
          showToast(`Failed to import ${response.data.failed} students. Check the results for details.`, 'warning');
        }
        fetchStudentsData();
      } else {
        showToast(response.error, 'error');
      }
    } catch (error) {
      showToast('Failed to import students', 'error');
    }
  };

  // ── Handle single student creation ──────────────────
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      const response = await createStudent(formData);
      if (response.success) {
        showToast('Student created successfully');
        setIsModalOpen(false);
        resetForm();
        fetchStudentsData();
      } else {
        showToast(response.error, 'error');
      }
    } catch (error) {
      showToast('Failed to create student', 'error');
    }
  };

  // ── Handle student update ───────────────────────────
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      const response = await updateStudent(selectedStudent.id, formData);
      if (response.success) {
        showToast('Student updated successfully');
        setIsModalOpen(false);
        setIsEditMode(false);
        resetForm();
        fetchStudentsData();
      } else {
        showToast(response.error, 'error');
      }
    } catch (error) {
      showToast('Failed to update student', 'error');
    }
  };

  // ── Handle student delete ───────────────────────────
  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      const response = await deleteStudent(studentId);
      if (response.success) {
        showToast('Student deleted successfully');
        fetchStudentsData();
      } else {
        showToast(response.error, 'error');
      }
    } catch (error) {
      showToast('Failed to delete student', 'error');
    }
  };

  // ── Filter students ─────────────────────────────────
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm ||
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id_number.includes(searchTerm) ||
      (student.student_course && student.student_course.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCourse = filters.course === 'All' || student.student_course === filters.course;
    const matchesYearLevel = filters.yearLevel === 'All' || student.student_yr_level === filters.yearLevel;
    return matchesSearch && matchesCourse && matchesYearLevel;
  });

  // ── Reset form ──────────────────────────────────────
  const resetForm = () => {
    setFormData({
      student_id_number: '',
      student_name: '',
      student_course: '',
      student_yr_level: '',
      student_email: '',
      student_contact: ''
    });
    setSelectedStudent(null);
  };

  // ── Download sample Excel template ──────────────────
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Username': '202112345',
        'Email': 'john.doe@example.com',
        'Password': 'password123',
        'Display Name': 'John Doe',
        'Role': 'student',
        'First Name': 'John',
        'Last Name': 'Doe'
      }
    ];

    import('xlsx').then(XLSX => {
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      XLSX.writeFile(workbook, 'student_import_template.xlsx');
    });
  };

  // ── Initialize data ─────────────────────────────────
  useEffect(() => {
    fetchStudentsData();
  }, []);

  return (
    <div className="p-6">
      {/* ── Page Header ────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <User className="w-8 h-8 text-amber-500" />
            Student Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage student details and bulk import functionality
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* ── Statistics Cards ────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Students"
            value={stats.total}
            icon={User}
            color="blue"
          />
          {stats.byCourse.slice(0, 1).map((course) => (
            <StatsCard
              key={course.student_course}
              title={`${course.student_course} (${course.count})`}
              value={`${Math.round((course.count / stats.total) * 100)}%`}
              icon={Building2}
              color="green"
            />
          ))}
          {stats.byYearLevel.slice(0, 2).map((yearLevel) => (
            <StatsCard
              key={yearLevel.student_yr_level}
              title={`${yearLevel.student_yr_level} (${yearLevel.count})`}
              value={`${Math.round((yearLevel.count / stats.total) * 100)}%`}
              icon={GraduationCap}
              color="purple"
            />
          ))}
        </div>
      )}

      {/* ── Filters and Search ──────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            {/* Course Filter */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filters.course}
                onChange={(e) => setFilters({ ...filters, course: e.target.value })}
                className="pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none"
              >
                <option value="All">All Courses</option>
                {stats?.byCourse.map((course) => (
                  <option key={course.student_course} value={course.student_course}>
                    {course.student_course}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {/* Year Level Filter */}
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filters.yearLevel}
                onChange={(e) => setFilters({ ...filters, yearLevel: e.target.value })}
                className="pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none"
              >
                <option value="All">All Year Levels</option>
                {stats?.byYearLevel.map((yearLevel) => (
                  <option key={yearLevel.student_yr_level} value={yearLevel.student_yr_level}>
                    {yearLevel.student_yr_level}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Students Table ───────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading students...</span>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Student
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    ID Number
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Course
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Year Level
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Display Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    First Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Last Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                          <User className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="font-medium text-gray-800 dark:text-white">
                          {student.student_name}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800 dark:text-white">
                      {student.student_id_number}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800 dark:text-white">
                      {student.student_course || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800 dark:text-white">
                      {student.student_yr_level || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800 dark:text-white">
                      {student.student_email || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800 dark:text-white">
                      {student.display_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800 dark:text-white">
                      {student.first_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800 dark:text-white">
                      {student.last_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setFormData(student);
                            setIsEditMode(true);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
              {searchTerm ? 'No matching students found' : 'No students available'}
            </p>
          </div>
        )}
      </div>

      {/* ── Student Form Modal ───────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {isEditMode ? 'Edit Student' : 'Add Student'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEditMode(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={isEditMode ? handleUpdateStudent : handleCreateStudent}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Student ID Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.student_id_number}
                      onChange={(e) => setFormData({ ...formData, student_id_number: e.target.value })}
                      disabled={isEditMode}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                      placeholder="Enter student ID number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Student Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.student_name}
                      onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter student name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Course
                    </label>
                    <input
                      type="text"
                      value={formData.student_course}
                      onChange={(e) => setFormData({ ...formData, student_course: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter course"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Year Level
                    </label>
                    <input
                      type="text"
                      value={formData.student_yr_level}
                      onChange={(e) => setFormData({ ...formData, student_yr_level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter year level"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.student_email}
                      onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={formData.student_contact}
                      onChange={(e) => setFormData({ ...formData, student_contact: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter contact number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter display name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setIsEditMode(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isEditMode ? 'Save Changes' : 'Add Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Import Modal ────────────────────────────── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Bulk Import Students
              </h2>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Excel File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                    {importFile ? (
                      <div className="flex flex-col items-center">
                        <FileSpreadsheet className="w-12 h-12 text-green-500 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{importFile.name}</p>
                        <p className="text-xs text-gray-400">
                          {(importFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <button
                          onClick={() => setImportFile(null)}
                          className="mt-2 text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove File
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          Drag & drop Excel file here or click to browse
                        </p>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                            ref={fileInputRef}
                          />
                          <span className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-sm">
                            Choose File
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          Supports Excel files (.xlsx, .xls)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Download Template */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={downloadSampleTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Sample Template
                  </button>
                </div>

                {/* Import Results */}
                {importResult && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">
                      Import Results
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-800 dark:text-white">
                          Successfully imported: {importResult.successful}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-gray-800 dark:text-white">
                          Failed to import: {importResult.failed}
                        </span>
                      </div>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900 rounded-md">
                        <h4 className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                          Errors:
                        </h4>
                        <div className="text-xs text-red-600 dark:text-red-400 max-h-32 overflow-y-auto">
                          {importResult.errors.map((error, index) => (
                            <div key={index} className="mb-1">
                              <strong>Row {error.index + 2}:</strong> {error.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                {parsedStudentsData && !importResult && (
                  <button
                    onClick={() => handleBulkImport(parsedStudentsData)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                  >
                    Import to Database
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportFile(null);
                    setParsedStudentsData(null);
                    setImportResult(null);
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Parsed Data Preview */}
              {parsedStudentsData && !importResult && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">
                    Parsed Students Data ({parsedStudentsData.length} students)
                  </h3>
                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                            ID Number
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                            Name
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                            Email
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                            Year Level
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedStudentsData.slice(0, 5).map((student, index) => (
                          <tr key={index} className="border-b border-gray-100 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600">
                            <td className="py-2 px-3 text-gray-800 dark:text-white">
                              {student.student_id_number}
                            </td>
                            <td className="py-2 px-3 text-gray-800 dark:text-white">
                              {student.student_name}
                            </td>
                            <td className="py-2 px-3 text-gray-800 dark:text-white">
                              {student.student_email || 'N/A'}
                            </td>
                            <td className="py-2 px-3 text-gray-800 dark:text-white">
                              {student.student_yr_level || 'N/A'}
                            </td>
                          </tr>
                        ))}
                        {parsedStudentsData.length > 5 && (
                          <tr>
                            <td colSpan="4" className="py-2 px-3 text-center text-gray-500 dark:text-gray-400">
                              And {parsedStudentsData.length - 5} more students...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ───────────────────────────── */}
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
