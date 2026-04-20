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
  const [importSchoolYear, setImportSchoolYear] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors]     = useState({});  // field-level errors for import modal
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

  // ── School Year tab state ────────────────────────────
  const [selectedSY, setSelectedSY] = useState(null);

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
    // ── Validate required import fields before touching the server ──
    const errs = {};
    if (!importCourse.trim())     errs.importCourse     = 'Course is required before importing.';
    if (!importSchoolYear.trim()) errs.importSchoolYear = 'School Year is required before importing.';
    if (Object.keys(errs).length) {
      setImportErrors(errs);
      return;
    }
    setImportErrors({});
    setIsImporting(true);
    setImportProgress(0);

    // Simulate progress ticks while the real request is in-flight
    const totalSteps = 90; // advance to 90% then jump to 100 on success
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= totalSteps) {
          clearInterval(interval);
          return prev;
        }
        // slow down as it approaches 90 so it never "finishes" early
        const increment = prev < 60 ? 4 : prev < 80 ? 2 : 0.5;
        return Math.min(prev + increment, totalSteps);
      });
    }, 200);

    try {
      const studentsWithCourse = studentsData.map(student => ({
        ...student,
        student_course: importCourse,
        student_school_year: importSchoolYear
      }));

      const response = await bulkImportStudents(studentsWithCourse);
      clearInterval(interval);

      if (response.success) {
        setImportProgress(100);
        setImportResult(response.data);
        setParsedStudentsData(null);
        showToast(`Successfully imported ${response.data.successful} students`, 'success');
        if (response.data.failed > 0) {
          showToast(`Failed to import ${response.data.failed} students. Check the results for details.`, 'warning');
        }
        fetchStudentsData();
      } else {
        setImportProgress(0);
        showToast(response.error || 'Import failed', 'error');
      }
    } catch (error) {
      clearInterval(interval);
      setImportProgress(0);
      showToast('Failed to import students', 'error');
    } finally {
      setIsImporting(false);
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

  // ── Derive sorted school years from students ─────────
  // Must be declared BEFORE filteredStudents which depends on it
  const schoolYears = [...new Set(
    students.map(s => s.student_school_year).filter(Boolean)
  )].sort((a, b) => {
    const aYear = parseInt((a || '').split('-')[1] || a || 0);
    const bYear = parseInt((b || '').split('-')[1] || b || 0);
    return bYear - aYear;
  });

  // ── Auto-select the latest S.Y. when students load ──
  useEffect(() => {
    if (schoolYears.length > 0) {
      setSelectedSY(prev => prev && schoolYears.includes(prev) ? prev : schoolYears[0]);
    } else {
      setSelectedSY(null);
    }
  }, [students]); // eslint-disable-line

  // ── Filter students ─────────────────────────────────
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm ||
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id_number.includes(searchTerm) ||
      (student.student_course && student.student_course.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCourse = filters.course === 'All' || student.student_course === filters.course;
    const matchesYearLevel = filters.yearLevel === 'All' || student.student_yr_level === filters.yearLevel;
    const matchesSY = schoolYears.length === 0 || !selectedSY || student.student_school_year === selectedSY;
    return matchesSearch && matchesCourse && matchesYearLevel && matchesSY;
  });

  // ── Pagination calculations ──────────────────────────
  const totalPages = Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE
  );

  // ── Reset to page 1 when filters/search/SY change ───
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, selectedSY]);

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
    <div className="flex flex-col gap-5">
      {/* ── Page Header ────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold"
            style={{ color: "var(--text-primary)" }}>
            <GraduationCap size={22} style={{ color: "var(--accent-amber)" }} />
            Student Management
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Manage student records, enrollments, and bulk import functionality
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          <button
            onClick={() => {
              const now = new Date();
              const syStart = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
              setImportSchoolYear(`${syStart}-${syStart + 1}`);
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[.98]"
            style={{
              background: "rgba(45,122,71,0.1)",
              border: "1.5px solid rgba(45, 63, 122, 0.35)",
              color: "var(--text-primary)",
            }}
          >
            <Upload size={14} />
            Bulk Import
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
            style={{ background: "var(--accent-amber)", boxShadow: "0 2px 8px rgba(238,162,58,.3)" }}
          >
            <Plus size={14} /> Add Student
          </button>
        </div>
      </div>

      {/* ── Statistics Cards ────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Students */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(30,58,123,0.1)' }}>
              <User size={16} style={{ color: '#1e3a7b' }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide leading-none" style={{ color: 'var(--text-muted)' }}>Total</p>
              <p className="text-[20px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{stats.total}</p>
              <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>students enrolled</p>
            </div>
          </div>

          {/* Top Course */}
          {stats.byCourse.slice(0, 1).map((course) => (
            <div key={course.student_course}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(238,162,58,0.12)' }}>
                <Building2 size={16} style={{ color: '#b87a1a' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide leading-none" style={{ color: 'var(--text-muted)' }}>Top Course</p>
                <p className="text-[20px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{course.count}</p>
                <p className="text-[10.5px] font-semibold truncate" style={{ color: '#b87a1a' }}>{course.student_course}</p>
              </div>
            </div>
          ))}

          {/* Year Level Cards */}
          {stats.byYearLevel.slice(0, 4).map((yearLevel, idx) => {
            const yrColors = [
              { bg: 'rgba(59,130,246,0.1)',  text: '#2563eb', label: '1st Year' },
              { bg: 'rgba(16,185,129,0.1)',  text: '#059669', label: '2nd Year' },
              { bg: 'rgba(168,85,247,0.1)',  text: '#7c3aed', label: '3rd Year' },
              { bg: 'rgba(239,68,68,0.1)',   text: '#dc2626', label: '4th Year' },
            ];
            const c = yrColors[idx] || yrColors[0];
            const shortLabel = yearLevel.student_yr_level?.replace(' Year', 'yr') || c.label;
            return (
              <div key={yearLevel.student_yr_level}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'var(--bg-surface)', border: `1px solid var(--border)` }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: c.bg }}>
                  <GraduationCap size={16} style={{ color: c.text }} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide leading-none" style={{ color: 'var(--text-muted)' }}>{yearLevel.student_yr_level}</p>
                  <p className="text-[20px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{yearLevel.count}</p>
                  <p className="text-[10.5px] font-semibold" style={{ color: c.text }}>students</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── School Year Tabs ─────────────────────────────── */}
      {schoolYears.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            {/* Label */}
            <div className="flex items-center gap-1.5 mr-1">
              <FileText className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                School Year
              </span>
            </div>

            {/* Divider */}
            <div className="w-px h-5 self-center" style={{ background: 'var(--border)' }} />

            {/* Tab buttons */}
            {schoolYears.map(sy => {
              const count = students.filter(s => s.student_school_year === sy).length;
              const isActive = selectedSY === sy;
              return (
                <button
                  key={sy}
                  onClick={() => setSelectedSY(sy)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150"
                  style={isActive ? {
                    background: 'linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(30,58,123,0.35)',
                    border: '1px solid transparent',
                  } : {
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    boxShadow: 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#2d4fa3';
                      e.currentTarget.style.color = '#2d4fa3';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {sy}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                    style={isActive ? {
                      background: 'rgba(255,255,255,0.25)',
                      color: '#ffffff',
                    } : {
                      background: 'var(--bg-input)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filters and Search ──────────────────────────── */}
      <div
        className="rounded-xl p-5"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  minWidth: '220px',
                }}
              />
            </div>
            {/* Course Filter */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <select
                value={filters.course}
                onChange={(e) => setFilters({ ...filters, course: e.target.value })}
                className="pl-10 pr-10 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 appearance-none transition-colors"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="All">All Courses</option>
                {stats?.byCourse.map((course) => (
                  <option key={course.student_course} value={course.student_course}>
                    {course.student_course}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>
            {/* Year Level Filter */}
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <select
                value={filters.yearLevel}
                onChange={(e) => setFilters({ ...filters, yearLevel: e.target.value })}
                className="pl-10 pr-10 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 appearance-none transition-colors"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="All">All Year Levels</option>
                {stats?.byYearLevel.map((yearLevel) => (
                  <option key={yearLevel.student_yr_level} value={yearLevel.student_yr_level}>
                    {yearLevel.student_yr_level}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* ── Results count ─────────────────────────── */}
          {!isLoading && (
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Showing <span style={{ color: 'var(--text-primary)' }}>{paginatedStudents.length}</span> of <span style={{ color: 'var(--text-primary)' }}>{filteredStudents.length}</span> student{filteredStudents.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* ── Students Table ───────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <svg className="animate-spin" style={{ width: 18, height: 18, color: 'var(--accent-amber)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="ml-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>Loading students...</span>
          </div>
        ) : filteredStudents.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                    {['Student', 'ID Number', 'Course', 'Year Level', 'Email', 'Display Name', 'First Name', 'Last Name', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student, idx) => (
                    <tr
                      key={student.id}
                      style={{ borderBottom: '1px solid var(--border-light)' }}
                      className="hover:bg-amber-50/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-[13px]">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                            style={{ background: 'rgba(30,58,123,0.12)', color: '#2d4fa3', border: '1px solid rgba(30,58,123,0.2)' }}
                          >
                            {student.student_name?.charAt(0)?.toUpperCase() || <User size={13} />}
                          </div>
                          <span className="font-semibold text-slate-900" style={{ color: 'var(--text-primary)' }}>
                            {student.student_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[13px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {student.student_id_number}
                      </td>
                      <td className="py-3 px-4 text-[13px]">
                        {student.student_course ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(50,102,127,.12)', color: '#32667F' }}>
                            {student.student_course}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {student.student_yr_level ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed' }}>
                            {student.student_yr_level}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="py-3 px-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {student.student_email || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="py-3 px-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {student.display_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="py-3 px-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {student.first_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="py-3 px-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {student.last_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setFormData(student);
                              setIsEditMode(true);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg transition-colors duration-150"
                            style={{ color: '#2d4fa3' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,58,123,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="p-1.5 rounded-lg transition-colors duration-150"
                            style={{ color: '#dc2626' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ─────────────────────────────── */}
            <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <AlertCircle size={28} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {searchTerm ? 'No matching students found' : 'No students available'}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {searchTerm ? 'Try adjusting your search or filters' : 'Add students manually or use bulk import'}
            </p>
          </div>
        )}
      </div>

      {/* ── Student Form Modal ───────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,22,34,0.65)', backdropFilter: 'blur(4px)' }}>
          <div
            className="rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.28)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)' }}>
                  <GraduationCap size={16} className="text-white" />
                </div>
                <h2 className="text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  {isEditMode ? 'Edit Student' : 'Add New Student'}
                </h2>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setIsEditMode(false); resetForm(); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
                style={{ color: 'var(--text-muted)' }}
              >
                <XCircle size={18} />
              </button>
            </div>
            <form onSubmit={isEditMode ? handleUpdateStudent : handleCreateStudent}>
              <div className="space-y-3">
                {[
                  { label: 'Student ID Number', key: 'student_id_number', type: 'text', required: true, placeholder: 'Enter student ID number' },
                  { label: 'Student Name',      key: 'student_name',      type: 'text', required: true, placeholder: 'Enter student name' },
                  { label: 'Course',            key: 'student_course',    type: 'text', required: true, placeholder: 'Enter course (e.g., BSIT)' },
                  { label: 'Email',             key: 'student_email',     type: 'email', placeholder: 'Enter email address' },
                  { label: 'Contact Number',    key: 'student_contact',   type: 'text', placeholder: 'Enter contact number' },
                ].map(({ label, key, type, required, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[12.5px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
                    </label>
                    <input
                      type={type}
                      required={required}
                      value={formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                      style={{ background: 'var(--bg-input)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[12.5px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Year Level
                  </label>
                  <div className="relative">
                    <select
                      value={formData.student_yr_level}
                      onChange={(e) => setFormData({ ...formData, student_yr_level: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 appearance-none"
                      style={{ background: 'var(--bg-input)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Select year level</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </div>

              {/* ── Modal footer ──────────────────────────── */}
              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4"
                style={{ borderTop: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setIsEditMode(false); resetForm(); }}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80 active:scale-[.98]"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98]"
                  style={{ background: 'linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)', boxShadow: '0 2px 8px rgba(30,58,123,0.35)' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,22,34,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.28)' }}>
            {/* ── Modal Header ───────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)' }}>
                  <Upload size={16} className="text-white" />
                </div>
                <h2 className="text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  Bulk Import Students
                </h2>
              </div>
              <button
                onClick={() => {
                  if (isImporting) return;
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setParsedStudentsData(null);
                  setImportResult(null);
                  setImportCourse('');
                  setImportSchoolYear('');
                  setImportProgress(0);
                  setImportErrors({});
                }}
                disabled={isImporting}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--text-muted)' }}
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* ── Import Progress Bar ─────────────────────── */}
              {isImporting && (
                <div className="p-4 rounded-xl"
                  style={{ background: 'rgba(238,162,58,0.08)', border: '1.5px solid rgba(238,162,58,0.35)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold flex items-center gap-2"
                      style={{ color: 'var(--accent-amber)' }}>
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Importing students, please wait…
                    </span>
                    <span className="text-[13px] font-bold" style={{ color: 'var(--accent-amber)' }}>
                      {Math.round(importProgress)}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'rgba(238,162,58,0.2)' }}>
                    <div className="h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${importProgress}%`, background: 'var(--accent-amber)' }} />
                  </div>
                  <p className="text-[11.5px] font-medium mt-2" style={{ color: 'var(--text-muted)' }}>
                    ⚠ Do not close this window while import is in progress.
                  </p>
                </div>
              )}

              {/* ── File Upload ─────────────────────────────── */}
              <div>
                <label className="block text-[12.5px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Upload Excel File
                </label>
                <div
                  className="rounded-xl p-8 text-center transition-colors"
                  style={{ border: '2px dashed var(--border)', background: 'var(--bg-subtle)' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileChange({ target: { files: [file] } });
                  }}
                >
                  {importFile ? (
                    <div className="flex flex-col items-center gap-1">
                      <FileSpreadsheet size={36} style={{ color: '#2d7a47' }} />
                      <p className="text-[13px] font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                        {importFile.name}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        onClick={() => {
                          setImportFile(null);
                          setParsedStudentsData(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="mt-1 text-[12px] font-semibold transition-opacity hover:opacity-70"
                        style={{ color: '#dc2626' }}
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload size={32} style={{ color: 'var(--text-muted)' }} />
                      <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Drag & drop Excel file here or click to browse
                      </p>
                      <label className="cursor-pointer mt-2">
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={handleFileChange}
                          className="hidden"
                          ref={fileInputRef}
                        />
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90"
                          style={{ background: 'var(--accent-amber)' }}>
                          Choose File
                        </span>
                      </label>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        Supports Excel files (.xlsx, .xls)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Course Selection ────────────────────────── */}
              <div>
                <label className="block text-[12.5px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Course <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={importCourse}
                    onChange={(e) => {
                      setImportCourse(e.target.value);
                      setImportErrors(p => ({ ...p, importCourse: '' }));
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 appearance-none"
                    style={{ background: 'var(--bg-input)', border: `1.5px solid ${importErrors.importCourse ? '#dc2626' : 'var(--border)'}`, color: 'var(--text-primary)' }}
                  >
                    <option value="">Select a course</option>
                    {['BSIT', 'BEED', 'BSED', 'BA', 'BSCRIM'].map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }} />
                </div>
                {importErrors.importCourse && (
                  <p className="text-[11.5px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: '#dc2626' }}>
                    <AlertCircle size={12} /> {importErrors.importCourse}
                  </p>
                )}
              </div>

              {/* ── School Year Selection ───────────────────── */}
              <div>
                <label className="block text-[12.5px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  School Year <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={importSchoolYear}
                    onChange={(e) => {
                      setImportSchoolYear(e.target.value);
                      setImportErrors(p => ({ ...p, importSchoolYear: '' }));
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 appearance-none"
                    style={{ background: 'var(--bg-input)', border: `1.5px solid ${importErrors.importSchoolYear ? '#dc2626' : 'var(--border)'}`, color: 'var(--text-primary)' }}
                  >
                    <option value="">Select school year</option>
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const syStartYear = new Date().getMonth() >= 5 ? currentYear : currentYear - 1;
                      return Array.from({ length: 6 }, (_, i) => {
                        const start = syStartYear - i;
                        return `${start}-${start + 1}`;
                      });
                    })().map(sy => (
                      <option key={sy} value={sy}>{sy}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  All students in this import batch will be tagged with this school year.
                </p>
                {importErrors.importSchoolYear && (
                  <p className="text-[11.5px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: '#dc2626' }}>
                    <AlertCircle size={12} /> {importErrors.importSchoolYear}
                  </p>
                )}
              </div>

              {/* ── Download Template ───────────────────────── */}
              <div className="flex items-center justify-center">
                <button
                  onClick={downloadSampleTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d4fa3'; e.currentTarget.style.color = '#2d4fa3'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <Download size={14} />
                  Download Sample Template
                </button>
              </div>

              {/* ── Import Results ──────────────────────────── */}
              {importResult && (
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                  <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    Import Results
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(45,122,71,0.08)', border: '1px solid rgba(45,122,71,0.2)' }}>
                      <CheckCircle2 size={14} style={{ color: '#2d7a47' }} />
                      <span className="text-[12.5px] font-medium" style={{ color: '#2d7a47' }}>
                        {importResult.successful} imported
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}>
                      <XCircle size={14} style={{ color: '#dc2626' }} />
                      <span className="text-[12.5px] font-medium" style={{ color: '#dc2626' }}>
                        {importResult.failed} failed
                      </span>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#dc2626' }}>
                        Errors
                      </h4>
                      <div className="text-[12px] max-h-32 overflow-y-auto space-y-1" style={{ color: '#dc2626' }}>
                        {importResult.errors.map((error, index) => (
                          <div key={index}>
                            <strong>Row {error.index + 2}:</strong> {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Modal Footer ────────────────────────────── */}
            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4"
              style={{ borderTop: '1px solid var(--border-light)' }}>
              {importResult && (
                <button
                  onClick={() => {
                    setImportResult(null);
                    setImportFile(null);
                    setParsedStudentsData(null);
                    setImportCourse('');
                    setImportSchoolYear('');
                    setImportProgress(0);
                    setImportErrors({});
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98]"
                  style={{ background: 'var(--accent-amber)', boxShadow: '0 2px 8px rgba(238,162,58,.3)' }}
                >
                  <Upload size={14} />
                  Import Again
                </button>
              )}
              {parsedStudentsData && !importResult && (
                <button
                  onClick={() => handleBulkImport(parsedStudentsData)}
                  disabled={isImporting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #0a0064, #0003c7)', boxShadow: '0 2px 8px rgba(45,122,71,.3)' }}
                >
                  {isImporting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Importing…
                    </>
                  ) : 'Import to Database'}
                </button>
              )}
              <button
                onClick={() => {
                  if (isImporting) return;
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setParsedStudentsData(null);
                  setImportResult(null);
                  setImportCourse('');
                  setImportSchoolYear('');
                  setImportProgress(0);
                  setImportErrors({});
                }}
                disabled={isImporting}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Close
              </button>
            </div>

            {/* ── Parsed Data Preview ──────────────────────── */}
            {parsedStudentsData && !importResult && (
              <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Preview — {parsedStudentsData.length} students parsed
                </h3>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                        {['ID Number', 'Name', 'Year Level', 'Email'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide"
                            style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedStudentsData.slice(0, 5).map((student, index) => (
                        <tr key={index} className="hover:bg-amber-50/30 transition-colors"
                          style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td className="py-2 px-3 text-[12.5px] font-mono" style={{ color: 'var(--text-secondary)' }}>{student.student_id_number}</td>
                          <td className="py-2 px-3 text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{student.student_name}</td>
                          <td className="py-2 px-3 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{student.student_yr_level || '—'}</td>
                          <td className="py-2 px-3 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{student.student_email || '—'}</td>
                        </tr>
                      ))}
                      {parsedStudentsData.length > 5 && (
                        <tr>
                          <td colSpan="4" className="py-2 px-3 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            And {parsedStudentsData.length - 5} more students…
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

      <style>{`
        @keyframes overlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn   { from { opacity: 0; transform: scale(.94) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>
  );
}