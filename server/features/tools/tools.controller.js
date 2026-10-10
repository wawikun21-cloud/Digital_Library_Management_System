const toolsService = require("./tools.service");
const { uploadsDir } = require("../../config/uploads");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

// Roles allowed to see and manage unpublished tools.
const MANAGE_ROLES = ["super_admin", "admin", "staff"];

function canManage(role) {
  return MANAGE_ROLES.includes(role);
}

function listTools(req, res) {
  return runAsync(req, res, async () => {
    const role = req.session?.user?.role;

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
    if (!canManage(role)) filters.is_active = "true";

    const result = await toolsService.listTools(filters);
    res.status(200).json({ success: true, ...result });
  });
}

function getTool(req, res) {
  return runAsync(req, res, async () => {
    const tool = await toolsService.getTool(parseInt(req.params.id));
    if (!tool) {
      return res.status(404).json({ success: false, error: "Tool not found" });
    }
    if (!tool.is_active && !canManage(req.session?.user?.role)) {
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

    if (files.thumbnail && files.thumbnail[0]) {
      const thumb = files.thumbnail[0];
      const ext = path.extname(thumb.originalname).toLowerCase() || ".webp";
      const filename = `thumb_${crypto.randomBytes(16).toString("hex")}${ext}`;
      const toolDir = path.join(uploadsDir, "tools");
      const filePath = path.join(toolDir, filename);

      await fs.mkdir(toolDir, { recursive: true });
      await fs.writeFile(filePath, thumb.buffer);

      toolData.thumbnail_url = `/uploads/tools/${filename}`;
    }

    if (files.file && files.file[0]) {
      const file = files.file[0];
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;
      const toolDir = path.join(uploadsDir, "tools");
      const filePath = path.join(toolDir, filename);

      await fs.mkdir(toolDir, { recursive: true });
      await fs.writeFile(filePath, file.buffer);

      toolData.file_path = filename;
      toolData.file_size = file.size;
      toolData.file_type = file.mimetype;
    }

    const id = await toolsService.createTool(userId, toolData);
    const saved = await toolsService.getTool(id);
    res.status(201).json({ success: true, data: saved });
  });
}

function updateTool(req, res) {
  return runAsync(req, res, async () => {
    const id = parseInt(req.params.id);
    const existing = await toolsService.getTool(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Tool not found" });
    }

    const updates = { ...req.body };
    if (updates.is_active !== undefined) {
      updates.is_active = updates.is_active === "true" || updates.is_active === true;
    }
    const files = req.files || {};

    if (files.thumbnail && files.thumbnail[0]) {
      const thumb = files.thumbnail[0];
      if (existing.thumbnail_url) {
        const oldThumb = path.join(uploadsDir, "tools", existing.thumbnail_url);
        try { await fs.unlink(oldThumb); } catch {}
      }

      const ext = path.extname(thumb.originalname).toLowerCase() || ".webp";
      const filename = `thumb_${crypto.randomBytes(16).toString("hex")}${ext}`;
      const toolDir = path.join(uploadsDir, "tools");
      await fs.mkdir(toolDir, { recursive: true });
      await fs.writeFile(path.join(toolDir, filename), thumb.buffer);
      updates.thumbnail_url = `/uploads/tools/${filename}`;
    }

    if (files.file && files.file[0]) {
      const file = files.file[0];
      if (existing.file_path) {
        const oldPath = path.join(uploadsDir, "tools", existing.file_path);
        try { await fs.unlink(oldPath); } catch {}
      }

      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;
      const toolDir = path.join(uploadsDir, "tools");
      await fs.mkdir(toolDir, { recursive: true });
      await fs.writeFile(path.join(toolDir, filename), file.buffer);
      updates.file_path = filename;
      updates.file_size = file.size;
      updates.file_type = file.mimetype;
    }

    await toolsService.updateTool(id, updates);
    const updated = await toolsService.getTool(id);
    res.status(200).json({ success: true, data: updated });
  });
}

function deleteTool(req, res) {
  return runAsync(req, res, async () => {
    const id = parseInt(req.params.id);
    const existing = await toolsService.getTool(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Tool not found" });
    }

    if (existing.file_path) {
      const filePath = path.join(uploadsDir, "tools", existing.file_path);
      try { await fs.unlink(filePath); } catch {}
    }

    await toolsService.deleteTool(id);
    res.status(200).json({ success: true, message: "Tool deleted" });
  });
}

function getCategories(req, res) {
  return runAsync(req, res, async () => {
    const activeOnly = !canManage(req.session?.user?.role);
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
    const tool = await toolsService.getTool(id);
    if (!tool) {
      return res.status(404).json({ success: false, error: "Tool not found" });
    }

    // Managers may download an unpublished tool to verify the upload.
    if (!tool.is_active && !canManage(req.session?.user?.role)) {
      return res.status(403).json({ success: false, error: "Tool is not available" });
    }

    await toolsService.incrementDownload(id);

    const filePath = path.join(uploadsDir, "tools", tool.file_path);
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
