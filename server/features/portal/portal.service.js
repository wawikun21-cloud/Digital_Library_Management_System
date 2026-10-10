const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const repo = require("./portal.repository");
const { uploadsDir } = require("../../config/uploads");
const { detectImageExtension } = require("../../utils/detectImageExtension");

const MAX_SLIDES = 8;
const SECTION_LIMIT = 6;
const HERO_URL_PREFIX = "/uploads/portal-hero/";
const heroDir = path.join(uploadsDir, "portal-hero");

class PortalError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function saveHeroImage(buffer) {
  const extension = detectImageExtension(buffer);
  if (!extension) throw new PortalError(400, "The uploaded file is not a valid JPEG, PNG, or WebP image.");
  const filename = `${crypto.randomUUID()}${extension}`;
  await fs.mkdir(heroDir, { recursive: true });
  await fs.writeFile(path.join(heroDir, filename), buffer, { flag: "wx" });
  return `${HERO_URL_PREFIX}${filename}`;
}

/** Only ever deletes files inside the portal-hero folder. */
async function removeHeroImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith(HERO_URL_PREFIX)) return;
  const filePath = path.join(heroDir, path.basename(imageUrl));
  await fs.unlink(filePath).catch(() => {});
}

async function getHome() {
  const [slides, books, courses] = await Promise.all([
    repo.listSlides({ activeOnly: true }),
    repo.listLatestPublishedBooks(SECTION_LIMIT),
    repo.listLatestPublishedCourses(SECTION_LIMIT),
  ]);
  return { slides, books, courses };
}

async function listSlides() {
  return repo.listSlides();
}

async function createSlide({ file, fields, userId }) {
  if (!file) throw new PortalError(400, "Choose an image for the slide.");
  if ((await repo.countSlides()) >= MAX_SLIDES) {
    throw new PortalError(400, `You can have up to ${MAX_SLIDES} slides. Delete one to add another.`);
  }
  const image_url = await saveHeroImage(file.buffer);
  try {
    return await repo.insertSlide({ ...fields, image_url, created_by: userId });
  } catch (error) {
    await removeHeroImage(image_url);
    throw error;
  }
}

async function updateSlide({ id, file, fields }) {
  const existing = await repo.getSlide(id);
  if (!existing) throw new PortalError(404, "Slide not found.");

  const changes = { ...fields };
  if (file) changes.image_url = await saveHeroImage(file.buffer);

  const updated = await repo.updateSlide(id, changes);
  if (file) await removeHeroImage(existing.image_url);
  return updated;
}

async function deleteSlide(id) {
  const existing = await repo.getSlide(id);
  if (!existing) throw new PortalError(404, "Slide not found.");
  await repo.deleteSlide(id);
  await removeHeroImage(existing.image_url);
}

async function reorderSlides(ids) {
  const current = await repo.listSlides();
  const currentIds = current.map((slide) => slide.id).sort((a, b) => a - b);
  const requested = [...ids].sort((a, b) => a - b);
  if (currentIds.length !== requested.length || currentIds.some((id, i) => id !== requested[i])) {
    throw new PortalError(400, "The slide list is out of date. Reload and try again.");
  }
  await repo.reorderSlides(ids);
  return repo.listSlides();
}

module.exports = {
  PortalError, MAX_SLIDES, getHome, listSlides, createSlide, updateSlide, deleteSlide, reorderSlides,
};
