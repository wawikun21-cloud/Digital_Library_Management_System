import { BookOpen, Library, Wrench } from "lucide-react";

export const studentPortalCards = [
  {
    id: "lexora-ebooks",
    title: "Lexora E-Books",
    description: "Browse and read the digital library catalog",
    icon: BookOpen,
    to: "/lexora-books",
    color: "bg-blue-500",
  },
  {
    id: "course-library",
    title: "Course Library",
    description: "Access your enrolled courses and materials",
    icon: Library,
    to: "/dashboard/course-library",
    color: "bg-emerald-500",
  },
  {
    id: "tools",
    title: "Tools",
    description: "Library tools and utilities",
    icon: Wrench,
    to: "/dashboard/tools",
    color: "bg-amber-500",
  },
];
