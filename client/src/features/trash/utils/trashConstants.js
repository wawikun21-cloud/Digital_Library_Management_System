import {
  BookOpen,
  BookMarked,
  GraduationCap,
  Users,
  UserCheck,
  ClipboardList,
  CalendarCheck,
} from "lucide-react";

export const TYPE_CONFIG = {
  book:        { label: "NEMCO Book",   Icon: BookOpen,      color: "#32667F",  bg: "rgba(50,102,127,0.1)"  },
  lexora_book: { label: "Lexora Book",  Icon: BookMarked,    color: "#7c3aed",  bg: "rgba(124,58,237,0.1)"  },
  course:      { label: "Course",       Icon: GraduationCap, color: "#0e7490",  bg: "rgba(14,116,144,0.1)"  },
  student:     { label: "Student",      Icon: Users,         color: "#0e7490",  bg: "rgba(14,116,144,0.1)"  },
  faculty:     { label: "Faculty",      Icon: UserCheck,     color: "#b45309",  bg: "rgba(180,83,9,0.1)"    },
  transaction: { label: "Transaction",  Icon: ClipboardList, color: "#b87a1a",  bg: "rgba(238,162,58,0.1)"  },
  attendance:  { label: "Attendance",   Icon: CalendarCheck, color: "#15803d",  bg: "rgba(21,128,61,0.1)"   },
};

export const FILTER_TABS = [
  { key: "all",        label: "All"          },
  { key: "book",       label: "NEMCO Books"  },
  { key: "lexora_book",label: "Lexora Books" },
  { key: "course",     label: "Courses"      },
  { key: "student",    label: "Students"     },
  { key: "faculty",    label: "Faculty"     },
  { key: "transaction",label: "Transactions" },
  { key: "attendance", label: "Attendance"   },
];

export const SORT_OPTIONS = [
  { value: "newest",   label: "Newest First"   },
  { value: "oldest",   label: "Oldest First"   },
  { value: "expiring", label: "Expiring Soon"  },
  { value: "type",     label: "By Type"        },
];

export const SORT_LABELS = {
  newest: "Newest First",
  oldest: "Oldest First",
  expiring: "Expiring Soon",
  type: "By Type",
};
