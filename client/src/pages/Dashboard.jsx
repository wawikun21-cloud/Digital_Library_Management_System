import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Crown, Users, AlertTriangle, Calendar } from "lucide-react";
import StatsCard from "../components/StatsCard";

// ══════════════════════════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════════════════════════

const STATS = [
  { label: "Total Books",  value: "1,284", change: "+12 this month", accent: "#132F45", percentage: 85 },
  { label: "Available",    value: "920",   change: "+5 today",       accent: "#32667F", percentage: 72 },
  { label: "Out of Stock", value: "364",   change: "+8 this week",   accent: "#dc2626", percentage: 28 },
  { label: "Returned",     value: "920",   change: "+8 this week",   accent: "#32667F", percentage: 72 },
];

const SEMESTERS = ["1st Sem", "2nd Sem"];
const SEM_MONTHS = {
  "1st Sem": ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
  "2nd Sem": ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
};

const BORROWED_DATA = {
  "1st Sem": {
    "All": [
      { short: "Clean Code",          borrows: 87 },
      { short: "Pragmatic Prog.",      borrows: 74 },
      { short: "Design Patterns",      borrows: 61 },
      { short: "Refactoring",          borrows: 55 },
      { short: "You Don't Know JS",    borrows: 48 },
      { short: "Eloquent JavaScript",  borrows: 39 },
      { short: "The Mythical Man-Mo.", borrows: 33 },
      { short: "Code Complete",        borrows: 28 },
      { short: "Working Effectively",  borrows: 22 },
      { short: "The Soft. Craftsman",  borrows: 17 },
    ],
    "Aug": [
      { short: "Clean Code",    borrows: 18 }, { short: "Refactoring",    borrows: 14 },
      { short: "Design Pat.",   borrows: 12 }, { short: "YDKJS",          borrows: 9  },
      { short: "Eloquent JS",   borrows: 7  }, { short: "Man-Month",      borrows: 6  },
      { short: "Code Complete", borrows: 5  }, { short: "Working Eff.",   borrows: 4  },
      { short: "Pragmatic",     borrows: 3  }, { short: "Soft. Craft.",   borrows: 2  },
    ],
    "Sep": [
      { short: "Clean Code",    borrows: 21 }, { short: "Pragmatic",      borrows: 17 },
      { short: "Design Pat.",   borrows: 13 }, { short: "YDKJS",          borrows: 10 },
      { short: "Eloquent JS",   borrows: 8  }, { short: "Refactoring",    borrows: 7  },
      { short: "Man-Month",     borrows: 5  }, { short: "Code Complete",  borrows: 4  },
      { short: "Working Eff.",  borrows: 3  }, { short: "Soft. Craft.",   borrows: 2  },
    ],
    "Oct": [
      { short: "Pragmatic",     borrows: 19 }, { short: "Clean Code",     borrows: 16 },
      { short: "Refactoring",   borrows: 12 }, { short: "Man-Month",      borrows: 8  },
      { short: "Design Pat.",   borrows: 6  }, { short: "YDKJS",          borrows: 5  },
      { short: "Code Complete", borrows: 4  }, { short: "Eloquent JS",    borrows: 3  },
      { short: "Working Eff.",  borrows: 3  }, { short: "Soft. Craft.",   borrows: 2  },
    ],
    "Nov": [
      { short: "Design Pat.",   borrows: 22 }, { short: "Clean Code",     borrows: 18 },
      { short: "Pragmatic",     borrows: 14 }, { short: "Eloquent JS",    borrows: 11 },
      { short: "YDKJS",         borrows: 9  }, { short: "Code Complete",  borrows: 7  },
      { short: "Refactoring",   borrows: 6  }, { short: "Man-Month",      borrows: 5  },
      { short: "Working Eff.",  borrows: 4  }, { short: "Soft. Craft.",   borrows: 3  },
    ],
    "Dec": [
      { short: "Refactoring",   borrows: 15 }, { short: "Man-Month",      borrows: 10 },
      { short: "Clean Code",    borrows: 8  }, { short: "YDKJS",          borrows: 6  },
      { short: "Design Pat.",   borrows: 4  }, { short: "Pragmatic",      borrows: 4  },
      { short: "Code Complete", borrows: 3  }, { short: "Eloquent JS",    borrows: 2  },
      { short: "Working Eff.",  borrows: 2  }, { short: "Soft. Craft.",   borrows: 1  },
    ],
    "Jan": [
      { short: "Clean Code",    borrows: 24 }, { short: "Pragmatic",      borrows: 20 },
      { short: "Eloquent JS",   borrows: 13 }, { short: "Design Pat.",    borrows: 10 },
      { short: "Refactoring",   borrows: 9  }, { short: "Code Complete",  borrows: 8  },
      { short: "YDKJS",         borrows: 6  }, { short: "Man-Month",      borrows: 5  },
      { short: "Working Eff.",  borrows: 4  }, { short: "Soft. Craft.",   borrows: 3  },
    ],
  },
  "2nd Sem": {
    "All": [
      { short: "Atomic Habits",  borrows: 92 },
      { short: "Sapiens",        borrows: 78 },
      { short: "Rich Dad Poor D.",borrows: 65 },
      { short: "The Alchemist",  borrows: 58 },
      { short: "Deep Work",      borrows: 47 },
      { short: "Zero to One",    borrows: 41 },
      { short: "Thinking F&S",   borrows: 36 },
      { short: "Ikigai",         borrows: 29 },
      { short: "Power of Now",   borrows: 23 },
      { short: "Subtle Art",     borrows: 18 },
    ],
    "Feb": [
      { short: "Atomic Habits",  borrows: 28 }, { short: "Sapiens",        borrows: 22 },
      { short: "Rich Dad",       borrows: 18 }, { short: "Alchemist",      borrows: 14 },
      { short: "Deep Work",      borrows: 11 }, { short: "Zero to One",    borrows: 9  },
      { short: "Thinking F&S",   borrows: 7  }, { short: "Ikigai",         borrows: 5  },
      { short: "Power of Now",   borrows: 4  }, { short: "Subtle Art",     borrows: 3  },
    ],
    "Mar": [
      { short: "Atomic Habits",  borrows: 32 }, { short: "Sapiens",        borrows: 27 },
      { short: "Zero to One",    borrows: 19 }, { short: "Rich Dad",       borrows: 15 },
      { short: "Thinking F&S",   borrows: 12 }, { short: "Alchemist",      borrows: 10 },
      { short: "Deep Work",      borrows: 8  }, { short: "Ikigai",         borrows: 6  },
      { short: "Power of Now",   borrows: 5  }, { short: "Subtle Art",     borrows: 4  },
    ],
    "Apr": [
      { short: "Sapiens",        borrows: 25 }, { short: "Alchemist",      borrows: 20 },
      { short: "Deep Work",      borrows: 16 }, { short: "Zero to One",    borrows: 12 },
      { short: "Atomic Habits",  borrows: 10 }, { short: "Rich Dad",       borrows: 8  },
      { short: "Ikigai",         borrows: 7  }, { short: "Thinking F&S",   borrows: 6  },
      { short: "Power of Now",   borrows: 5  }, { short: "Subtle Art",     borrows: 3  },
    ],
    "May": [
      { short: "Rich Dad",       borrows: 20 }, { short: "Alchemist",      borrows: 17 },
      { short: "Thinking F&S",   borrows: 13 }, { short: "Sapiens",        borrows: 10 },
      { short: "Deep Work",      borrows: 8  }, { short: "Ikigai",         borrows: 7  },
      { short: "Atomic Habits",  borrows: 6  }, { short: "Zero to One",    borrows: 5  },
      { short: "Power of Now",   borrows: 4  }, { short: "Subtle Art",     borrows: 3  },
    ],
    "Jun": [
      { short: "Zero to One",    borrows: 16 }, { short: "Atomic Habits",  borrows: 13 },
      { short: "Thinking F&S",   borrows: 10 }, { short: "Sapiens",        borrows: 8  },
      { short: "Rich Dad",       borrows: 6  }, { short: "Ikigai",         borrows: 5  },
      { short: "Deep Work",      borrows: 5  }, { short: "Alchemist",      borrows: 4  },
      { short: "Power of Now",   borrows: 3  }, { short: "Subtle Art",     borrows: 2  },
    ],
    "Jul": [
      { short: "Atomic Habits",  borrows: 19 }, { short: "Deep Work",      borrows: 12 },
      { short: "Rich Dad",       borrows: 9  }, { short: "Alchemist",      borrows: 7  },
      { short: "Zero to One",    borrows: 5  }, { short: "Ikigai",         borrows: 4  },
      { short: "Sapiens",        borrows: 4  }, { short: "Thinking F&S",   borrows: 3  },
      { short: "Power of Now",   borrows: 2  }, { short: "Subtle Art",     borrows: 2  },
    ],
  },
};

// Week date ranges per month (school year 2025–2026)
// Format: "Mon d–d" — short enough to fit on chart X-axis ticks
const WEEK_DATES = {
  "Aug": ["Aug 1–7",  "Aug 8–14",  "Aug 15–21", "Aug 22–31"],
  "Sep": ["Sep 1–7",  "Sep 8–14",  "Sep 15–21", "Sep 22–30"],
  "Oct": ["Oct 1–7",  "Oct 8–14",  "Oct 15–21", "Oct 22–31"],
  "Nov": ["Nov 1–7",  "Nov 8–14",  "Nov 15–21", "Nov 22–30"],
  "Dec": ["Dec 1–7",  "Dec 8–14",  "Dec 15–21", "Dec 22–31"],
  "Jan": ["Jan 1–7",  "Jan 8–14",  "Jan 15–21", "Jan 22–31"],
  "Feb": ["Feb 1–7",  "Feb 8–14",  "Feb 15–21", "Feb 22–28"],
  "Mar": ["Mar 1–7",  "Mar 8–14",  "Mar 15–21", "Mar 22–31"],
  "Apr": ["Apr 1–7",  "Apr 8–14",  "Apr 15–21", "Apr 22–30"],
  "May": ["May 1–7",  "May 8–14",  "May 15–21", "May 22–31"],
  "Jun": ["Jun 1–7",  "Jun 8–14",  "Jun 15–21", "Jun 22–30"],
  "Jul": ["Jul 1–7",  "Jul 8–14",  "Jul 15–21", "Jul 22–31"],
};

const ATTENDANCE_DATA = {
  "1st Sem": {
    "All": [
      { x: "Aug", visits: 1820 }, { x: "Sep", visits: 2140 }, { x: "Oct", visits: 1960 },
      { x: "Nov", visits: 2380 }, { x: "Dec", visits: 1340 }, { x: "Jan", visits: 2560 },
    ],
    "Aug": [{ x: WEEK_DATES.Aug[0], visits: 410 }, { x: WEEK_DATES.Aug[1], visits: 470 }, { x: WEEK_DATES.Aug[2], visits: 490 }, { x: WEEK_DATES.Aug[3], visits: 450 }],
    "Sep": [{ x: WEEK_DATES.Sep[0], visits: 510 }, { x: WEEK_DATES.Sep[1], visits: 530 }, { x: WEEK_DATES.Sep[2], visits: 560 }, { x: WEEK_DATES.Sep[3], visits: 540 }],
    "Oct": [{ x: WEEK_DATES.Oct[0], visits: 480 }, { x: WEEK_DATES.Oct[1], visits: 500 }, { x: WEEK_DATES.Oct[2], visits: 490 }, { x: WEEK_DATES.Oct[3], visits: 490 }],
    "Nov": [{ x: WEEK_DATES.Nov[0], visits: 570 }, { x: WEEK_DATES.Nov[1], visits: 610 }, { x: WEEK_DATES.Nov[2], visits: 600 }, { x: WEEK_DATES.Nov[3], visits: 600 }],
    "Dec": [{ x: WEEK_DATES.Dec[0], visits: 380 }, { x: WEEK_DATES.Dec[1], visits: 350 }, { x: WEEK_DATES.Dec[2], visits: 320 }, { x: WEEK_DATES.Dec[3], visits: 290 }],
    "Jan": [{ x: WEEK_DATES.Jan[0], visits: 620 }, { x: WEEK_DATES.Jan[1], visits: 650 }, { x: WEEK_DATES.Jan[2], visits: 640 }, { x: WEEK_DATES.Jan[3], visits: 650 }],
  },
  "2nd Sem": {
    "All": [
      { x: "Feb", visits: 2310 }, { x: "Mar", visits: 2640 }, { x: "Apr", visits: 2190 },
      { x: "May", visits: 1870 }, { x: "Jun", visits: 1540 }, { x: "Jul", visits: 1220 },
    ],
    "Feb": [{ x: WEEK_DATES.Feb[0], visits: 550 }, { x: WEEK_DATES.Feb[1], visits: 580 }, { x: WEEK_DATES.Feb[2], visits: 600 }, { x: WEEK_DATES.Feb[3], visits: 580 }],
    "Mar": [{ x: WEEK_DATES.Mar[0], visits: 630 }, { x: WEEK_DATES.Mar[1], visits: 680 }, { x: WEEK_DATES.Mar[2], visits: 670 }, { x: WEEK_DATES.Mar[3], visits: 660 }],
    "Apr": [{ x: WEEK_DATES.Apr[0], visits: 540 }, { x: WEEK_DATES.Apr[1], visits: 560 }, { x: WEEK_DATES.Apr[2], visits: 550 }, { x: WEEK_DATES.Apr[3], visits: 540 }],
    "May": [{ x: WEEK_DATES.May[0], visits: 480 }, { x: WEEK_DATES.May[1], visits: 470 }, { x: WEEK_DATES.May[2], visits: 470 }, { x: WEEK_DATES.May[3], visits: 450 }],
    "Jun": [{ x: WEEK_DATES.Jun[0], visits: 400 }, { x: WEEK_DATES.Jun[1], visits: 390 }, { x: WEEK_DATES.Jun[2], visits: 380 }, { x: WEEK_DATES.Jun[3], visits: 370 }],
    "Jul": [{ x: WEEK_DATES.Jul[0], visits: 320 }, { x: WEEK_DATES.Jul[1], visits: 310 }, { x: WEEK_DATES.Jul[2], visits: 300 }, { x: WEEK_DATES.Jul[3], visits: 290 }],
  },
};

const FINES_DATA = {
  "1st Sem": {
    "All": [
      { x: "Aug", collected: 720,  uncollected: 380 }, { x: "Sep", collected: 860,  uncollected: 290 },
      { x: "Oct", collected: 940,  uncollected: 310 }, { x: "Nov", collected: 1080, uncollected: 420 },
      { x: "Dec", collected: 510,  uncollected: 190 }, { x: "Jan", collected: 1240, uncollected: 360 },
    ],
    "Aug": [{ x: WEEK_DATES.Aug[0], collected: 170, uncollected: 90  }, { x: WEEK_DATES.Aug[1], collected: 185, uncollected: 95  }, { x: WEEK_DATES.Aug[2], collected: 195, uncollected: 105 }, { x: WEEK_DATES.Aug[3], collected: 170, uncollected: 90  }],
    "Sep": [{ x: WEEK_DATES.Sep[0], collected: 200, uncollected: 70  }, { x: WEEK_DATES.Sep[1], collected: 215, uncollected: 75  }, { x: WEEK_DATES.Sep[2], collected: 225, uncollected: 75  }, { x: WEEK_DATES.Sep[3], collected: 220, uncollected: 70  }],
    "Oct": [{ x: WEEK_DATES.Oct[0], collected: 220, uncollected: 80  }, { x: WEEK_DATES.Oct[1], collected: 240, uncollected: 75  }, { x: WEEK_DATES.Oct[2], collected: 245, uncollected: 80  }, { x: WEEK_DATES.Oct[3], collected: 235, uncollected: 75  }],
    "Nov": [{ x: WEEK_DATES.Nov[0], collected: 255, uncollected: 100 }, { x: WEEK_DATES.Nov[1], collected: 275, uncollected: 110 }, { x: WEEK_DATES.Nov[2], collected: 280, uncollected: 105 }, { x: WEEK_DATES.Nov[3], collected: 270, uncollected: 105 }],
    "Dec": [{ x: WEEK_DATES.Dec[0], collected: 145, uncollected: 55  }, { x: WEEK_DATES.Dec[1], collected: 130, uncollected: 50  }, { x: WEEK_DATES.Dec[2], collected: 125, uncollected: 45  }, { x: WEEK_DATES.Dec[3], collected: 110, uncollected: 40  }],
    "Jan": [{ x: WEEK_DATES.Jan[0], collected: 295, uncollected: 90  }, { x: WEEK_DATES.Jan[1], collected: 315, uncollected: 95  }, { x: WEEK_DATES.Jan[2], collected: 320, uncollected: 90  }, { x: WEEK_DATES.Jan[3], collected: 310, uncollected: 85  }],
  },
  "2nd Sem": {
    "All": [
      { x: "Feb", collected: 1350, uncollected: 450 }, { x: "Mar", collected: 1520, uncollected: 510 },
      { x: "Apr", collected: 1180, uncollected: 390 }, { x: "May", collected: 970,  uncollected: 310 },
      { x: "Jun", collected: 780,  uncollected: 260 }, { x: "Jul", collected: 590,  uncollected: 200 },
    ],
    "Feb": [{ x: WEEK_DATES.Feb[0], collected: 320, uncollected: 110 }, { x: WEEK_DATES.Feb[1], collected: 340, uncollected: 115 }, { x: WEEK_DATES.Feb[2], collected: 345, uncollected: 115 }, { x: WEEK_DATES.Feb[3], collected: 345, uncollected: 110 }],
    "Mar": [{ x: WEEK_DATES.Mar[0], collected: 370, uncollected: 125 }, { x: WEEK_DATES.Mar[1], collected: 385, uncollected: 130 }, { x: WEEK_DATES.Mar[2], collected: 390, uncollected: 130 }, { x: WEEK_DATES.Mar[3], collected: 375, uncollected: 125 }],
    "Apr": [{ x: WEEK_DATES.Apr[0], collected: 290, uncollected: 95  }, { x: WEEK_DATES.Apr[1], collected: 300, uncollected: 100 }, { x: WEEK_DATES.Apr[2], collected: 300, uncollected: 100 }, { x: WEEK_DATES.Apr[3], collected: 290, uncollected: 95  }],
    "May": [{ x: WEEK_DATES.May[0], collected: 245, uncollected: 80  }, { x: WEEK_DATES.May[1], collected: 248, uncollected: 78  }, { x: WEEK_DATES.May[2], collected: 242, uncollected: 77  }, { x: WEEK_DATES.May[3], collected: 235, uncollected: 75  }],
    "Jun": [{ x: WEEK_DATES.Jun[0], collected: 200, uncollected: 68  }, { x: WEEK_DATES.Jun[1], collected: 198, uncollected: 66  }, { x: WEEK_DATES.Jun[2], collected: 195, uncollected: 64  }, { x: WEEK_DATES.Jun[3], collected: 187, uncollected: 62  }],
    "Jul": [{ x: WEEK_DATES.Jul[0], collected: 152, uncollected: 52  }, { x: WEEK_DATES.Jul[1], collected: 148, uncollected: 50  }, { x: WEEK_DATES.Jul[2], collected: 148, uncollected: 50  }, { x: WEEK_DATES.Jul[3], collected: 142, uncollected: 48  }],
  },
};

const OVERDUE_DATA = {
  "1st Sem": {
    "All": [
      { x: "Aug", critical: 2, warning: 4, minor: 6  }, { x: "Sep", critical: 3, warning: 5, minor: 7  },
      { x: "Oct", critical: 4, warning: 6, minor: 8  }, { x: "Nov", critical: 5, warning: 7, minor: 9  },
      { x: "Dec", critical: 2, warning: 3, minor: 5  }, { x: "Jan", critical: 6, warning: 8, minor: 10 },
    ],
    "Aug": [{ x: WEEK_DATES.Aug[0], critical: 0, warning: 1, minor: 2 }, { x: WEEK_DATES.Aug[1], critical: 1, warning: 1, minor: 2 }, { x: WEEK_DATES.Aug[2], critical: 1, warning: 2, minor: 2 }, { x: WEEK_DATES.Aug[3], critical: 0, warning: 0, minor: 0 }],
    "Sep": [{ x: WEEK_DATES.Sep[0], critical: 1, warning: 1, minor: 2 }, { x: WEEK_DATES.Sep[1], critical: 1, warning: 2, minor: 2 }, { x: WEEK_DATES.Sep[2], critical: 1, warning: 1, minor: 2 }, { x: WEEK_DATES.Sep[3], critical: 0, warning: 1, minor: 1 }],
    "Oct": [{ x: WEEK_DATES.Oct[0], critical: 1, warning: 2, minor: 2 }, { x: WEEK_DATES.Oct[1], critical: 1, warning: 2, minor: 2 }, { x: WEEK_DATES.Oct[2], critical: 2, warning: 1, minor: 2 }, { x: WEEK_DATES.Oct[3], critical: 0, warning: 1, minor: 2 }],
    "Nov": [{ x: WEEK_DATES.Nov[0], critical: 1, warning: 2, minor: 2 }, { x: WEEK_DATES.Nov[1], critical: 2, warning: 2, minor: 2 }, { x: WEEK_DATES.Nov[2], critical: 1, warning: 2, minor: 3 }, { x: WEEK_DATES.Nov[3], critical: 1, warning: 1, minor: 2 }],
    "Dec": [{ x: WEEK_DATES.Dec[0], critical: 1, warning: 1, minor: 2 }, { x: WEEK_DATES.Dec[1], critical: 0, warning: 1, minor: 1 }, { x: WEEK_DATES.Dec[2], critical: 1, warning: 1, minor: 1 }, { x: WEEK_DATES.Dec[3], critical: 0, warning: 0, minor: 1 }],
    "Jan": [{ x: WEEK_DATES.Jan[0], critical: 2, warning: 2, minor: 2 }, { x: WEEK_DATES.Jan[1], critical: 2, warning: 2, minor: 3 }, { x: WEEK_DATES.Jan[2], critical: 1, warning: 2, minor: 3 }, { x: WEEK_DATES.Jan[3], critical: 1, warning: 2, minor: 2 }],
  },
  "2nd Sem": {
    "All": [
      { x: "Feb", critical: 3, warning: 5, minor: 8  }, { x: "Mar", critical: 5, warning: 7, minor: 12 },
      { x: "Apr", critical: 4, warning: 6, minor: 9  }, { x: "May", critical: 3, warning: 4, minor: 7  },
      { x: "Jun", critical: 2, warning: 3, minor: 5  }, { x: "Jul", critical: 1, warning: 2, minor: 4  },
    ],
    "Feb": [{ x: WEEK_DATES.Feb[0], critical: 1, warning: 1, minor: 2 }, { x: WEEK_DATES.Feb[1], critical: 1, warning: 2, minor: 2 }, { x: WEEK_DATES.Feb[2], critical: 1, warning: 1, minor: 2 }, { x: WEEK_DATES.Feb[3], critical: 0, warning: 1, minor: 2 }],
    "Mar": [{ x: WEEK_DATES.Mar[0], critical: 1, warning: 2, minor: 3 }, { x: WEEK_DATES.Mar[1], critical: 2, warning: 2, minor: 3 }, { x: WEEK_DATES.Mar[2], critical: 1, warning: 2, minor: 3 }, { x: WEEK_DATES.Mar[3], critical: 1, warning: 1, minor: 3 }],
    "Apr": [{ x: WEEK_DATES.Apr[0], critical: 1, warning: 2, minor: 2 }, { x: WEEK_DATES.Apr[1], critical: 1, warning: 2, minor: 2 }, { x: WEEK_DATES.Apr[2], critical: 1, warning: 1, minor: 3 }, { x: WEEK_DATES.Apr[3], critical: 1, warning: 1, minor: 2 }],
    "May": [{ x: WEEK_DATES.May[0], critical: 1, warning: 1, minor: 2 }, { x: WEEK_DATES.May[1], critical: 1, warning: 1, minor: 2 }, { x: WEEK_DATES.May[2], critical: 1, warning: 1, minor: 2 }, { x: WEEK_DATES.May[3], critical: 0, warning: 1, minor: 1 }],
    "Jun": [{ x: WEEK_DATES.Jun[0], critical: 1, warning: 1, minor: 1 }, { x: WEEK_DATES.Jun[1], critical: 0, warning: 1, minor: 1 }, { x: WEEK_DATES.Jun[2], critical: 1, warning: 1, minor: 2 }, { x: WEEK_DATES.Jun[3], critical: 0, warning: 0, minor: 1 }],
    "Jul": [{ x: WEEK_DATES.Jul[0], critical: 0, warning: 1, minor: 1 }, { x: WEEK_DATES.Jul[1], critical: 1, warning: 1, minor: 1 }, { x: WEEK_DATES.Jul[2], critical: 0, warning: 0, minor: 1 }, { x: WEEK_DATES.Jul[3], critical: 0, warning: 0, minor: 1 }],
  },
};

// Rank badge colours (top 3 get gold/silver/bronze tones)
const RANK_COLORS = [
  "#EEA23A", "#32667F", "#132F45", "#276096", "#2d71b0",
  "#3a7a96", "#4290ae", "#5aa0bc", "#6dafc8", "#82bed4",
];

// ══════════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ══════════════════════════════════════════════════════════════════════════════

// Compact number formatter for Y-axis labels so they never overflow
const fmtK = v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v;
const fmtPeso = v => v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : `₱${v}`;

function ChartTooltip({ active, payload, label, prefix = "", suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 text-[12px]"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg)",
        position: "relative",
        zIndex: 9999,
      }}>
      {label && (
        <p className="font-bold mb-1.5 pb-1.5 text-[11px] uppercase tracking-wide"
          style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-light)" }}>
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map(p => (
          <p key={p.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: p.fill || p.color || p.stroke }} />
              <span style={{ color: "var(--text-secondary)" }}>{p.name}</span>
            </span>
            <span className="font-bold" style={{ color: "var(--text-primary)" }}>
              {prefix}{p.value?.toLocaleString()}{suffix}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

// Card shell — h-full ensures grid rows share height uniformly
function Card({ title, icon: Icon, iconColor, iconBg, badge, children }) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-200 hover:shadow-md"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-light)" }}>
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: iconBg }}>
              <Icon size={13} style={{ color: iconColor }} />
            </div>
          )}
          <h2 className="text-[11px] font-bold uppercase tracking-wider truncate"
            style={{ color: "var(--text-secondary)" }}>
            {title}
          </h2>
        </div>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 min-h-0">{children}</div>
    </div>
  );
}

// Stat pills row — subtle summary numbers inside a card
function StatPills({ items }) {
  return (
    <div className="grid gap-2 px-4 py-2.5 flex-shrink-0"
      style={{
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        borderBottom: "1px solid var(--border-light)",
        background: "var(--bg-subtle)",
      }}>
      {items.map((s, i) => (
        <div key={i} className="flex flex-col items-center justify-center py-1.5 rounded-xl"
          style={{ background: s.bg }}>
          <span className="text-[14px] font-bold leading-none tabular-nums" style={{ color: s.color }}>
            {s.value}
          </span>
          <span className="text-[9px] font-semibold mt-0.5 text-center leading-tight" style={{ color: s.color }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FILTER BAR
// ══════════════════════════════════════════════════════════════════════════════

function FilterBar({ semester, month, onSemester, onMonth }) {
  const months = ["All", ...SEM_MONTHS[semester]];
  return (
    <div className="rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-2.5"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center gap-1.5">
        <Calendar size={12} style={{ color: "var(--text-muted)" }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Filter
        </span>
      </div>
      <div className="flex gap-0.5 p-0.5 rounded-lg"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        {SEMESTERS.map(s => (
          <button key={s} onClick={() => { onSemester(s); onMonth("All"); }}
            className="px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-150"
            style={{
              background: semester === s ? "var(--accent-amber)" : "transparent",
              color:      semester === s ? "#fff" : "var(--text-secondary)",
              boxShadow:  semester === s ? "0 2px 6px rgba(238,162,58,0.35)" : "none",
            }}>
            {s}
          </button>
        ))}
      </div>
      <div className="w-px h-4 flex-shrink-0" style={{ background: "var(--border-light)" }} />
      <div className="flex flex-wrap gap-1">
        {months.map(m => (
          <button key={m} onClick={() => onMonth(m)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-150"
            style={{
              background: month === m ? "#132F45" : "transparent",
              color:      month === m ? "#fff" : "var(--text-secondary)",
              border:     month === m ? "1px solid transparent" : "1px solid var(--border-light)",
            }}>
            {m}
          </button>
        ))}
      </div>
      <span className="ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: "rgba(19,47,69,0.08)", color: "#132F45" }}>
        {semester}{month !== "All" ? ` · ${month}` : " · All Months"}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIDGET 1 — Top 10 Most Borrowed Books
// Custom ranked list with inline progress bars — compact, no axis overflow
// ══════════════════════════════════════════════════════════════════════════════

function MostBorrowedBooks({ semester, month }) {
  const data = useMemo(() => {
    const raw = BORROWED_DATA[semester]?.[month] ?? BORROWED_DATA[semester]["All"];
    return [...raw].sort((a, b) => b.borrows - a.borrows).slice(0, 10);
  }, [semester, month]);

  const max   = data[0]?.borrows ?? 1;
  const total = data.reduce((s, d) => s + d.borrows, 0);

  return (
    <Card
      title="Top 10 Most Borrowed Books"
      icon={Crown}
      iconColor="#EEA23A"
      iconBg="rgba(238,162,58,0.12)"
      badge={{ label: `${total} total`, bg: "rgba(238,162,58,0.1)", color: "#b87a1a" }}
    >
      <div className="flex flex-col flex-1 min-h-0 px-3 py-2 gap-0">
        {data.map((book, i) => {
          const pct   = Math.round((book.borrows / max) * 100);
          const color = RANK_COLORS[i];
          const isTop = i < 3;
          return (
            <div
              key={book.short}
              className="flex items-center gap-2 py-1.5"
              style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border-light)" : "none" }}
            >
              {/* Rank badge */}
              <div
                className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                style={{
                  background: isTop ? color : "var(--bg-subtle)",
                  border:     isTop ? "none" : "1px solid var(--border-light)",
                }}
              >
                <span
                  className="text-[9px] font-bold leading-none tabular-nums"
                  style={{ color: isTop ? "#fff" : "var(--text-muted)" }}
                >
                  {i + 1}
                </span>
              </div>

              {/* Title + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="text-[12px] font-semibold leading-none truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {book.short}
                  </span>
                  <span
                    className="text-[11px] font-bold tabular-nums flex-shrink-0"
                    style={{ color }}
                  >
                    {book.borrows}
                  </span>
                </div>
                {/* Progress bar */}
                <div
                  className="h-[5px] rounded-full overflow-hidden"
                  style={{ background: "var(--border-light)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: color,
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>

              {/* Percentage pill */}
              <span
                className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}
              >
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIDGET 2 — Attendance Count (area chart)
// ══════════════════════════════════════════════════════════════════════════════

function AttendanceCount({ semester, month }) {
  const data  = useMemo(
    () => ATTENDANCE_DATA[semester]?.[month] ?? ATTENDANCE_DATA[semester]["All"],
    [semester, month]
  );
  const total = data.reduce((s, d) => s + d.visits, 0);
  const peak  = Math.max(...data.map(d => d.visits));

  return (
    <Card
      title="Attendance Count"
      icon={Users}
      iconColor="#32667F"
      iconBg="rgba(50,102,127,0.12)"
      badge={{ label: month === "All" ? semester : month, bg: "rgba(50,102,127,0.1)", color: "#32667F" }}
    >
      <StatPills items={[
        { value: total.toLocaleString(), label: "Total Visits", color: "#132F45", bg: "rgba(19,47,69,0.07)"  },
        { value: peak.toLocaleString(),  label: "Peak",         color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
      ]} />
      {/* Chart — fixed pixel height so it never overflows its card */}
      <div className="flex-1 min-h-0 py-3 pl-1 pr-3" style={{ minHeight: 150, maxHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#32667F" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#32667F" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border-light)" strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 9, fill: "var(--text-secondary)", fontWeight: 600 }}
              axisLine={false} tickLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={44}
            />
            <YAxis
              tickFormatter={fmtK}
              tick={{ fontSize: 9, fill: "var(--text-secondary)", fontWeight: 600 }}
              axisLine={false} tickLine={false}
              width={30}
            />
            <Tooltip content={<ChartTooltip suffix=" visits" />} wrapperStyle={{ zIndex: 9999 }} />
            <Area
              type="monotone" dataKey="visits" name="Visits"
              stroke="#32667F" strokeWidth={2}
              fill="url(#attGrad)"
              dot={{ r: 2.5, fill: "#32667F", strokeWidth: 0 }}
              activeDot={{ r: 4.5, fill: "#32667F", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIDGET 3 — Total Fines Collected (Donut chart)
// ══════════════════════════════════════════════════════════════════════════════

function TotalFinesCollected({ semester, month }) {
  const raw = useMemo(
    () => FINES_DATA[semester]?.[month] ?? FINES_DATA[semester]["All"],
    [semester, month]
  );

  const totCollect = raw.reduce((s, d) => s + d.collected,   0);
  const totUnpaid  = raw.reduce((s, d) => s + d.uncollected, 0);
  const grand      = totCollect + totUnpaid;
  const rate       = Math.round((totCollect / grand) * 100);

  const pieData = [
    { name: "Collected",   value: totCollect, color: "#32667F" },
    { name: "Uncollected", value: totUnpaid,  color: "#EEA23A" },
  ];

  // Custom tooltip
  const DonutTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <div className="rounded-xl px-3 py-2.5 text-[11px]"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          position: "relative",
          zIndex: 9999,
        }}>
        <p className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.payload.color }} />
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{d.name}</span>
        </p>
        <p className="font-bold text-[13px]" style={{ color: d.payload.color }}>
          ₱{d.value.toLocaleString()}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {((d.value / grand) * 100).toFixed(1)}% of total
        </p>
      </div>
    );
  };

  return (
    <Card
      title="Total Fines Collected"
      icon={() => <span className="text-[12px] font-bold leading-none" style={{ color: "#132F45" }}>₱</span>}
      iconColor="#132F45"
      iconBg="rgba(19,47,69,0.1)"
      badge={{ label: month === "All" ? semester : month, bg: "rgba(19,47,69,0.08)", color: "#132F45" }}
    >
      <StatPills items={[
        { value: `₱${(totCollect / 1000).toFixed(1)}k`, label: "Collected",   color: "#22c55e", bg: "rgba(34,197,94,0.08)"  },
        { value: `₱${(totUnpaid  / 1000).toFixed(1)}k`, label: "Uncollected", color: "#dc2626", bg: "rgba(220,38,38,0.07)"  },
        { value: `${rate}%`,                             label: "Rate",        color: "#32667F", bg: "rgba(50,102,127,0.08)" },
      ]} />

      {/* Donut + legend side by side */}
      <div className="flex flex-1 min-h-0 items-center px-4 py-3 gap-4">

        {/* Donut */}
        <div className="relative flex-shrink-0" style={{ width: 150, height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={3}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} wrapperStyle={{ zIndex: 9999 }} />
            </PieChart>
          </ResponsiveContainer>

          {/* Centre label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: "#32667F" }}>
              {rate}%
            </span>
            <span className="text-[9px] font-semibold mt-0.5 text-center leading-tight" style={{ color: "var(--text-muted)" }}>
              collected
            </span>
          </div>
        </div>

        {/* Legend + breakdown */}
        <div className="flex flex-col flex-1 gap-3 min-w-0">
          {pieData.map((entry) => (
            <div key={entry.name} className="flex flex-col gap-1.5">
              {/* Label row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                  <span className="text-[11px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {entry.name}
                  </span>
                </div>
                <span className="text-[11px] font-bold tabular-nums flex-shrink-0" style={{ color: entry.color }}>
                  ₱{entry.value.toLocaleString()}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(entry.value / grand) * 100}%`, background: entry.color }}
                />
              </div>
              {/* Percentage */}
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {((entry.value / grand) * 100).toFixed(1)}% of ₱{(grand / 1000).toFixed(1)}k total
              </span>
            </div>
          ))}

          {/* Divider + total */}
          <div className="pt-2 mt-auto" style={{ borderTop: "1px solid var(--border-light)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                Total Fines Issued
              </span>
              <span className="text-[12px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                ₱{grand.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIDGET 4 — Overdue Books (stacked bar)
// ══════════════════════════════════════════════════════════════════════════════

function OverdueBooks({ semester, month }) {
  const data    = useMemo(
    () => OVERDUE_DATA[semester]?.[month] ?? OVERDUE_DATA[semester]["All"],
    [semester, month]
  );
  const totCrit = data.reduce((s, d) => s + d.critical, 0);
  const totWarn = data.reduce((s, d) => s + d.warning,  0);
  const totMin  = data.reduce((s, d) => s + d.minor,    0);
  const grand   = totCrit + totWarn + totMin;

  return (
    <Card
      title="Overdue Books"
      icon={AlertTriangle}
      iconColor="#dc2626"
      iconBg="rgba(220,38,38,0.1)"
      badge={{ label: `${grand} total`, bg: "rgba(220,38,38,0.08)", color: "#dc2626" }}
    >
      <StatPills items={[
        { value: totCrit, label: "Critical", color: "#dc2626", bg: "rgba(220,38,38,0.08)"  },
        { value: totWarn, label: "Warning",  color: "#c05a0a", bg: "rgba(234,139,51,0.1)"  },
        { value: totMin,  label: "Minor",    color: "#b87a1a", bg: "rgba(238,162,58,0.1)"  },
      ]} />
      {/* Full-width row — fixed height so the chart never over-expands */}
      <div className="py-3 pl-1 pr-3" style={{ height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="35%" margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border-light)" />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
              axisLine={false} tickLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
              axisLine={false} tickLine={false}
              width={22}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip suffix=" books" />} cursor={{ fill: "var(--bg-hover)" }} wrapperStyle={{ zIndex: 9999 }} />
            <Legend
              iconType="circle" iconSize={7}
              wrapperStyle={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", paddingTop: 6 }}
            />
            <Bar dataKey="critical" name="Critical" fill="#dc2626" stackId="o" radius={[0, 0, 0, 0]} />
            <Bar dataKey="warning"  name="Warning"  fill="#c05a0a" stackId="o" radius={[0, 0, 0, 0]} />
            <Bar dataKey="minor"    name="Minor"    fill="#EEA23A" stackId="o" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
//
//  Desktop (lg) — 5-column explicit grid
//  ┌──────────────┬───────────────────────────────────┐
//  │ Most Borrowed│  Attendance Count                 │ row 1
//  │ col 1–2      │  col 3–5                          │
//  │ row-span 2   ├───────────────────────────────────┤
//  │              │  Total Fines Collected             │ row 2
//  │              │  col 3–5                          │
//  ├──────────────┴───────────────────────────────────┤
//  │  Overdue Books — full width col 1–5              │ row 3
//  └──────────────────────────────────────────────────┘
//
//  Mobile: single column, DOM order:
//    KPIs → Filter → MostBorrowed → Attendance → Fines → Overdue
// ══════════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const [semester, setSemester] = useState("2nd Sem");
  const [month,    setMonth]    = useState("All");

  return (
    <main className="flex flex-col gap-4 lg:gap-5" aria-label="Library Analytics Dashboard">
      <h1 className="sr-only">Analytics Dashboard Overview</h1>

      {/* KPI Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {STATS.map(stat => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            accent={stat.accent}
            percentage={stat.percentage}
          />
        ))}
      </section>

      {/* Filter Bar */}
      <FilterBar semester={semester} month={month} onSemester={setSemester} onMonth={setMonth} />

      {/*
        Bento Grid — 5 columns, 3 rows, zero dead space
        Row 1: Most Borrowed (col 1-2) | Attendance (col 3-5)
        Row 2: Most Borrowed (col 1-2) | Fines      (col 3-5)
        Row 3: Overdue Books — spans all 5 columns
      */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Most Borrowed — narrow left, spans rows 1 & 2 */}
        <div className="lg:col-start-1 lg:col-span-2 lg:row-start-1 lg:row-span-2">
          <MostBorrowedBooks semester={semester} month={month} />
        </div>

        {/* Attendance — wide right, row 1 */}
        <div className="lg:col-start-3 lg:col-span-3 lg:row-start-1">
          <AttendanceCount semester={semester} month={month} />
        </div>

        {/* Fines — wide right, row 2 */}
        <div className="lg:col-start-3 lg:col-span-3 lg:row-start-2">
          <TotalFinesCollected semester={semester} month={month} />
        </div>

        {/* Overdue — full width, row 3 */}
        <div className="lg:col-start-1 lg:col-span-5 lg:row-start-3">
          <OverdueBooks semester={semester} month={month} />
        </div>

      </div>
    </main>
  );
}