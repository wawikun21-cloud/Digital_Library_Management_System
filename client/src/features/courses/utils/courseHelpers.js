export function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString();
}

export function getCourseStatusColor(status) {
  const colors = {
    draft: "bg-gray-100 text-gray-700 border-gray-200",
    published: "bg-green-100 text-green-700 border-green-200",
    archived: "bg-amber-100 text-amber-700 border-amber-200",
    under_review: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return colors[status] || colors.draft;
}

export function getDifficultyColor(difficulty) {
  const colors = {
    beginner: "bg-green-100 text-green-700 border-green-200",
    intermediate: "bg-amber-100 text-amber-700 border-amber-200",
    advanced: "bg-red-100 text-red-700 border-red-200",
    all_levels: "bg-sky-100 text-sky-700 border-sky-200",
  };
  return colors[difficulty] || colors.all_levels;
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function normalizeVideoUrl(url) {
  if (!url) return "";

  const trimmed = url.trim();

  // YouTube watch → embed
  const ytWatchMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytWatchMatch) {
    return `https://www.youtube.com/embed/${ytWatchMatch[1]}`;
  }

  // Vimeo watch → embed
  const vimeoMatch = trimmed.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return trimmed;
}
