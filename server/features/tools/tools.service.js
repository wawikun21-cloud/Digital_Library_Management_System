const toolsRepo = require("./tools.repository");
const auditService = require("../../services/auditService");

async function listTools(filters) {
  return toolsRepo.listTools(filters);
}

async function getTool(id) {
  return toolsRepo.findById(id);
}

async function createTool(userId, toolData) {
  const id = await toolsRepo.create({ ...toolData, created_by: userId });
  return { id };
}

async function updateTool(id, updates) {
  return toolsRepo.update(id, updates);
}

async function deleteTool(id) {
  return toolsRepo.remove(id);
}

async function listActiveByCategory(category) {
  return toolsRepo.findByCategory(category);
}

async function listCategories(activeOnly = false) {
  return toolsRepo.listCategories(activeOnly);
}

async function incrementDownload(id) {
  await toolsRepo.incrementDownload(id);
  return true;
}

async function getToolStats() {
  return toolsRepo.getStats();
}

module.exports = {
  listTools,
  getTool,
  createTool,
  updateTool,
  deleteTool,
  listActiveByCategory,
  listCategories,
  incrementDownload,
  getToolStats,
};
