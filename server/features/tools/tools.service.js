const toolsRepo = require("./tools.repository");

async function listTools(filters, scope = null) {
  return toolsRepo.listTools(filters, null, scope);
}

async function getTool(id, scope = null) {
  return toolsRepo.findById(id, scope);
}

async function createTool(userId, toolData, scope = null) {
  const id = await toolsRepo.create({ ...toolData, created_by: userId }, scope);
  return id;
}

async function updateTool(id, updates, scope = null) {
  return toolsRepo.update(id, updates, scope);
}

async function deleteTool(id, scope = null) {
  return toolsRepo.remove(id, scope);
}

async function listActiveByCategory(category) {
  return toolsRepo.findByCategory(category);
}

async function listCategories(activeOnly = false) {
  return toolsRepo.listCategories(activeOnly);
}

async function incrementDownload(id) {
  await toolsRepo.incrementDownload(id);
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
