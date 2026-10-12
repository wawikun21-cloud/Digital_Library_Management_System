const service = require("./toc.service");

function handleError(res, label, error) {
  if (error instanceof service.TocError) {
    return res.status(error.status).json({ success: false, error: error.message });
  }
  console.error(`[BookIntelligence.${label}]`, error);
  return res.status(500).json({ success: false, error: "Internal server error" });
}

const TocController = {
  /**
   * POST /api/lexora-books/:id/toc/generate
   * Proposes a table of contents from the book's PDF. Read-only: the
   * librarian reviews the entries in the book form and saves them through
   * the normal update path.
   */
  async generate(req, res) {
    try {
      const data = await service.generateToc({ bookId: Number(req.params.id) });
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, "generateToc", error);
    }
  },
};

module.exports = TocController;
