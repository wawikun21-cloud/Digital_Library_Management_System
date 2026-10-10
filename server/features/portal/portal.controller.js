const service = require("./portal.service");
const { validateSlideInput, validateReorderInput } = require("./portal.validation");

function handleError(res, label, error) {
  if (error instanceof service.PortalError) {
    return res.status(error.status).json({ success: false, error: error.message });
  }
  console.error(`[PortalController.${label}]`, error);
  return res.status(500).json({ success: false, error: "Internal server error" });
}

const PortalController = {
  async getHome(_req, res) {
    try {
      res.json({ success: true, data: await service.getHome() });
    } catch (error) {
      handleError(res, "getHome", error);
    }
  },

  async listSlides(_req, res) {
    try {
      res.json({ success: true, data: await service.listSlides(), meta: { maxSlides: service.MAX_SLIDES } });
    } catch (error) {
      handleError(res, "listSlides", error);
    }
  },

  async createSlide(req, res) {
    const { errors, value } = validateSlideInput(req.body);
    if (errors.length) return res.status(400).json({ success: false, error: errors[0], errors });
    try {
      const slide = await service.createSlide({ file: req.file, fields: value, userId: req.session?.user?.id });
      res.status(201).json({ success: true, data: slide });
    } catch (error) {
      handleError(res, "createSlide", error);
    }
  },

  async updateSlide(req, res) {
    const { errors, value } = validateSlideInput(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ success: false, error: errors[0], errors });
    try {
      const slide = await service.updateSlide({ id: Number(req.params.id), file: req.file, fields: value });
      res.json({ success: true, data: slide });
    } catch (error) {
      handleError(res, "updateSlide", error);
    }
  },

  async deleteSlide(req, res) {
    try {
      await service.deleteSlide(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      handleError(res, "deleteSlide", error);
    }
  },

  async reorderSlides(req, res) {
    const { ids, error } = validateReorderInput(req.body);
    if (error) return res.status(400).json({ success: false, error });
    try {
      res.json({ success: true, data: await service.reorderSlides(ids) });
    } catch (err) {
      handleError(res, "reorderSlides", err);
    }
  },
};

module.exports = PortalController;
