const toolsService = require("./tools.service");
const { uploadsDir } = require("../../config/uploads");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

const TOOLS_DIR = path.join(uploadsDir, "tools");

// Anyone holding manage_tools may see and manage unpublished tools.
function canManage(req) {
  if (req.session?.user?.role === "super_admin") return true;
  return Array.isArray(req.permissions) && req.permissions.includes("manage_tools");
}

/**
 * Resolves a stored reference (a `/uploads/tools/<file>` URL, as written by
 * the create path, or a bare filename, as stored in file_path) to a path
 * inside the tools folder. Anything that would escape it returns null.
 */
function toolFilePath(reference) {
  if (typeof reference !== "string" || !reference) return null;
  const filename = path.basename(reference);
  if (!filename || filename === "." || filename === "..") return null;
  return path.join(TOOLS_DIR, filename);
}

async function removeToolFile(reference) {
  const filePath = toolFilePath(reference);
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {}
}

/**
 * Moves a multer temp file into the tools folder under a random name.
 * The uploader wrote it to disk, so this is a rename, not a buffer copy.
 */
async function storeToolAsset(file, namePrefix = "") {
  const extension = path.extname(file.originalname).toLowerCase();
  const filename = `${namePrefix}${crypto.randomBytes(16).toString("hex")}${extension}`;
  await fs.mkdir(TOOLS_DIR, { recursive: true });
  await fs.rename(file.path, path.join(TOOLS_DIR, filename));
  return filename;
}

function listTools(req, res) {
  return runAsync(req, res, async () => {
    const filters = {
      search: req.query.search,
      category: req.query.category,
      is_active: req.query.is_active,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      order: req.query.order,
    };

    // Non-managers may only browse active tools. Set after reading the query
    // so a crafted `is_active=false` cannot reveal unpublished entries.
    if (!canManage(req)) filters.is_active = "true";


      const result = await toolsService.listTools(filters, req.schoolScope);
    res.status(200).json({ success: true, ...result });
  });
}

function getTool(req, res) {
  return runAsync(req, res, async () => {
      const tool = await toolsService.getTool(parseInt(req.params.id), req.schoolScope);
    if (!tool) {
      return res.status(404).json({ success: false, error: "Tool not found" });
    }
    if (!tool.is_active && !canManage(req)) {
      return res.status(404).json({ success: false, error: "Tool not found" });
    }
    res.status(200).json({ success: true, data: tool });
  });
}

function createTool(req, res) {
  return runAsync(req, res, async () => {
    const userId = req.session?.user?.id;
    const toolData = {
      ...req.body,
      is_active: req.body.is_active === "true" || req.body.is_active === true,
      created_by: userId,
    };

    const files = req.files || {};
    const stored = [];

    try {
      if (files.thumbnail && files.thumbnail[0]) {
        const filename = await storeToolAsset(files.thumbnail[0], "thumb_");
        stored.push(filename);
        toolData.thumbnail_url = `/uploads/tools/${filename}`;
      }

      if (files.file && files.file[0]) {
        const file = files.file[0];
        const filename = await storeToolAsset(file);
        stored.push(filename);
        toolData.file_path = filename;
        toolData.file_size = file.size;
        toolData.file_type = file.mimetype;
      }

      const id = await toolsService.createTool(userId, toolData, req.schoolScope);
      const saved = await toolsService.getTool(id, req.schoolScope);
      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      // Never leave an asset on disk that no row points at.
      await Promise.all(stored.map((filename) => removeToolFile(filename)));
      throw error;
    }
  });
}

function updateTool(req, res) {
  return runAsync(req, res, async () => {
    const id = parseInt(req.params.id);
      const existing = await toolsService.getTool(id, req.schoolScope);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Tool not found" });
    }

    const updates = { ...req.body };
    if (updates.is_active !== undefined) {
      updates.is_active = updates.is_active === "true" || updates.is_active === true;
    }
    const files = req.files || {};
    const stored = [];

    try {
      if (files.thumbnail && files.thumbnail[0]) {
        const thumb = files.thumbnail[0];
        const filename = await storeToolAsset(thumb, "thumb_");
        stored.push(filename);
        updates.thumbnail_url = `/uploads/tools/${filename}`;
      }

      if (files.file && files.file[0]) {
        const file = files.file[0];
        const filename = await storeToolAsset(file);
        stored.push(filename);
        updates.file_path = filename;
        updates.file_size = file.size;
        updates.file_type = file.mimetype;
      }

      await toolsService.updateTool(id, updates, req.schoolScope);

      // Only drop the previous assets once the row is known to be updated.
      if (updates.thumbnail_url) await removeToolFile(existing.thumbnail_url);
      if (updates.file_path) await removeToolFile(existing.file_path);

      const updated = await toolsService.getTool(id, req.schoolScope);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      await Promise.all(stored.map((filename) => removeToolFile(filename)));
      throw error;
    }
  });
}

function deleteTool(req, res) {
  return runAsync(req, res, async () => {
    const id = parseInt(req.params.id);
      const existing = await toolsService.getTool(id, req.schoolScope);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Tool not found" });
    }

    await removeToolFile(existing.file_path);
    await removeToolFile(existing.thumbnail_url);

      await toolsService.deleteTool(id, req.schoolScope);
    res.status(200).json({ success: true, message: "Tool deleted" });
  });
}

function getCategories(req, res) {
  return runAsync(req, res, async () => {
    const activeOnly = !canManage(req);
    const categories = await toolsService.listCategories(activeOnly);
    res.status(200).json({ success: true, data: categories });
  });
}

function getStats(req, res) {
  return runAsync(req, res, async () => {
    const stats = await toolsService.getToolStats();
    res.status(200).json({ success: true, data: stats });
  });
}

function downloadTool(req, res) {
  return runAsync(req, res, async () => {
    const id = parseInt(req.params.id);
      const tool = await toolsService.getTool(id, req.schoolScope);
    if (!tool) {
      return res.status(404).json({ success: false, error: "Tool not found" });
    }

    // Managers may download an unpublished tool to verify the upload.
    if (!tool.is_active && !canManage(req)) {
      return res.status(403).json({ success: false, error: "Tool is not available" });
    }

    await toolsService.incrementDownload(id);

    const filePath = toolFilePath(tool.file_path);
    if (!filePath) {
      return res.status(404).json({ success: false, error: "Tool file is missing" });
    }
    res.download(filePath, tool.title);
  });
}

function runAsync(req, res, fn) {
  Promise.resolve(fn()).catch(err => {
    console.error("[ToolsController]", err.message);
    res.status(500).json({ success: false, error: err.message || "Internal server error" });
  });
}

module.exports = {
  listTools,
  getTool,
  createTool,
  updateTool,
  deleteTool,
  getCategories,
  getStats,
  downloadTool,
};
