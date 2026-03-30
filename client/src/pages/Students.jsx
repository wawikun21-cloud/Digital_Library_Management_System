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
import Pagination from '../components/books/Pagination';

// ─────────────────────────────────────────────────────────
//  Students Page
//  Manage student details and bulk import functionality
// ─────────────────────────────────────────────────────────

const STUDENTS_PER_PAGE = 10;

export default function Students() {
  // ── State management ──────────────────────────────────
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Pagination state ─────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

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
  const [importCourse, setImportCourse] = useState('');
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
      parseExcelFile(file);
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
        
        let allStudentsData = [];
        for (let sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const studentsData = jsonData.map(row => {
            let studentName = row['Display Name'] || row['display_name'] || '';
            if (!studentName) {
              const firstName = row['First Name'] || row['first_name'] || '';
              const lastName = row['Last Name'] || row['last_name'] || '';
              studentName = `${firstName} ${lastName}`.trim();
            }

            let yearLevel = '';
            const sheetNameLower = sheetName.toLowerCase();
            
            const numericMatch = sheetNameLower.match(/(\d+)/);
            if (numericMatch) {
              const sheetNumber = parseInt(numericMatch[1]);
              if (sheetNumber === 1) yearLevel = '1st Year';
              else if (sheetNumber === 2) yearLevel = '2nd Year';
              else if (sheetNumber === 3) yearLevel = '3rd Year';
              else if (sheetNumber === 4) yearLevel = '4th Year';
            }
            
            if (!yearLevel) {
              if (sheetNameLower.includes('1st') || sheetNameLower.includes('first')) yearLevel = '1st Year';
              else if (sheetNameLower.includes('2nd') || sheetNameLower.includes('second')) yearLevel = '2nd Year';
              else if (sheetNameLower.includes('3rd') || sheetNameLower.includes('third')) yearLevel = '3rd Year';
              else if (sheetNameLower.includes('4th') || sheetNameLower.includes('fourth')) yearLevel = '4th Year';
            }

            return {
              student_id_number: row['Username'] || row['username'] || '',
              student_name: studentName,
              student_course: '',
              student_yr_level: yearLevel,
              student_email: row['Email'] || row['email'] || '',
              student_contact: '',
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
      const studentsWithCourse = studentsData.map(student => ({
        ...student,
        student_course: importCourse
      }));
      
      const response = await bulkImportStudents(studentsWithCourse);
      if (response.success) {
        setImportResult(response.data);
        setParsedStudentsData(null);
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

  // ── Pagination calculations ──────────────────────────
  const totalPages = Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE
  );

  // ── Reset to page 1 when filters/search change ──────
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

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
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 dark:text-white font-medium rounded-md transition-colors"
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

          {/* ── Results count ─────────────────────────── */}
          {!isLoading && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Showing {paginatedStudents.length} of {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
            </p>
          )}
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
          <>
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
                  {paginatedStudents.map((student) => (
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

            {/* ── Pagination ─────────────────────────────── */}
            <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
              />
            </div>
          </>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="rounded-lg shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <h2
              className="text-xl font-bold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              {isEditMode ? 'Edit Student' : 'Add New Student'}
            </h2>
            <form onSubmit={isEditMode ? handleUpdateStudent : handleCreateStudent}>
              <div className="space-y-4">
                {[
                  { label: 'Student ID Number *', key: 'student_id_number', type: 'text', required: true, placeholder: 'Enter student ID number' },
                  { label: 'Student Name *',      key: 'student_name',      type: 'text', required: true, placeholder: 'Enter student name' },
                  { label: 'Course *',            key: 'student_course',    type: 'text', required: true, placeholder: 'Enter course (e.g., BSIT)' },
                  { label: 'Email',               key: 'student_email',     type: 'email', placeholder: 'Enter email address' },
                  { label: 'Contact Number',      key: 'student_contact',   type: 'text', placeholder: 'Enter contact number' },
                ].map(({ label, key, type, required, placeholder }) => (
                  <div key={key}>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {label}
                    </label>
                    <input
                      type={type}
                      required={required}
                      value={formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      style={{
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                ))}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Year Level
                  </label>
                  <select
                    value={formData.student_yr_level}
                    onChange={(e) => setFormData({ ...formData, student_yr_level: e.target.value })}
                    className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    style={{
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">Select year level</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              {/* ── Modal footer ──────────────────────────── */}
              <div
                className="flex items-center justify-end gap-3 mt-6 pt-4"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                  style={{ background: 'var(--accent-amber)' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {isEditMode ? 'Update Student' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Import Modal ────────────────────────────── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Bulk Import Students
              </h2>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setParsedStudentsData(null);
                  setImportResult(null);
                  setImportCourse('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Excel File
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileChange({ target: { files: [file] } });
                  }}
                >
                  {importFile ? (
                    <div className="flex flex-col items-center">
                      <FileSpreadsheet className="w-12 h-12 text-green-500 mb-2" />
                      <p className="text-sm text-gray-800 dark:text-white font-medium">
                        {importFile.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        onClick={() => {
                          setImportFile(null);
                          setParsedStudentsData(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="mt-2 text-xs text-red-500 hover:text-red-700"
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

              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Course *
                </label>
                <input
                  type="text"
                  required
                  value={importCourse}
                  onChange={(e) => setImportCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter course (e.g., BSIT)"
                />
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
                  setImportCourse('');
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
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">ID Number</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Name</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Year Level</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedStudentsData.slice(0, 5).map((student, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600">
                          <td className="py-2 px-3 text-gray-800 dark:text-white">{student.student_id_number}</td>
                          <td className="py-2 px-3 text-gray-800 dark:text-white">{student.student_name}</td>
                          <td className="py-2 px-3 text-gray-800 dark:text-white">{student.student_yr_level || 'N/A'}</td>
                          <td className="py-2 px-3 text-gray-800 dark:text-white">{student.student_email || 'N/A'}</td>
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