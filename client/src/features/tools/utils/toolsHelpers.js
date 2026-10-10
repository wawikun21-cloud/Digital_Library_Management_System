import {
  Package, GraduationCap, Palette, LayoutTemplate, Cpu, FileText,
} from "lucide-react";

// Single source of truth for tool categories — mirrors the backend
// TOOL_CATEGORIES in server/features/tools/tools.repository.js.
export const TOOL_CATEGORIES = [
  { key: "general",   label: "General",    Icon: Package,         color: "#32667F", bg: "rgba(50,102,127,0.12)" },
  { key: "education", label: "Education",  Icon: GraduationCap,   color: "#0e7490", bg: "rgba(14,116,144,0.12)" },
  { key: "design",    label: "Design",     Icon: Palette,         color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  { key: "templates", label: "Templates",  Icon: LayoutTemplate,  color: "#b87a1a", bg: "rgba(238,162,58,0.15)" },
  { key: "software",  label: "Software",   Icon: Cpu,             color: "#15803d", bg: "rgba(21,128,61,0.12)" },
  { key: "documents", label: "Documents",  Icon: FileText,        color: "#b45309", bg: "rgba(180,83,9,0.12)" },
];

export function getCategoryConfig(category) {
  return TOOL_CATEGORIES.find(c => c.key === category) || TOOL_CATEGORIES[0];
}

const MIME_TO_LABEL = {
  "application/pdf":           "PDF",
  "application/zip":           "ZIP",
  "application/x-rar-compressed": "RAR",
  "application/msword":        "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":      "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.ms-excel":  "XLS",
  "application/vnd.ms-powerpoint": "PPT",
  "text/plain":                "TXT",
  "text/csv":                  "CSV",
  "image/jpeg":                "JPG",
  "image/png":                 "PNG",
  "image/webp":                "WEBP",
  "video/mp4":                 "MP4",
  "video/quicktime":           "MOV",
  "application/x-7z-compressed": "7Z",
};

export function getFileTypeLabel(fileType) {
  if (!fileType) return "FILE";
  if (MIME_TO_LABEL[fileType]) return MIME_TO_LABEL[fileType];
  const ext = fileType.replace(/^.*[/\\]/, "").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 4);
  if (!ext) return "FILE";
  return ext.toUpperCase();
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
