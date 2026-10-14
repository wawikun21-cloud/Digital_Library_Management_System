// ─────────────────────────────────────────────────────────
//  features/organization/index.js
//
//  Public API of the organization feature. Other features
//  (users, books, lexora, transactions, attendance, courses,
//  tools, faculty, audit, trash, analytics) import ONLY from
//  here — never from internal files.
// ─────────────────────────────────────────────────────────

const OrganizationService = require("./organization.service");
const OrganizationRepository = require("./organization.repository");
const { resolveSchoolScope, isScoped } = require("./schoolScope");
const bookAccess = require("./bookAccess.service");
const attendanceAccess = require("./attendanceAccess.service");

module.exports = {
  router: require("./organization.routes.js"),
  OrganizationService,
  OrganizationRepository,
  resolveSchoolScope,
  isScoped,
  bookAccess,
  attendanceAccess,
};
