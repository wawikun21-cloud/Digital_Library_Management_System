// ─────────────────────────────────────────────────────────
//  features/organization/organization.service.js
//
//  Business rules for the school organization feature:
//    • schools — writes restricted to super_admin (service level,
//      not just the guard); delete blocked while referenced
//    • departments — belong to a valid school in the caller's scope
//    • categories — belong to a department in the caller's scope;
//      unique name per department (ER_DUP_ENTRY → friendly error)
//    • every operation re-validates ownership server-side; a
//      department or category from another school is rejected
//      no matter what ID the request carries.
// ─────────────────────────────────────────────────────────

const OrganizationRepository = require("./organization.repository");

function isDuplicateError(err) {
  return err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062);
}

function isForeignKeyError(err) {
  return err && (err.code === "ER_ROW_IS_REFERENCED_2" || err.errno === 1451);
}

const OrganizationService = {

  // ── Schools ─────────────────────────────────────────────

  async listSchools(scope) {
    return OrganizationRepository.listSchools(scope);
  },

  async getSchool(scope, id) {
    const school = await OrganizationRepository.getSchoolById(id);
    if (!school) return { success: false, status: 404, error: "School not found" };
    if (scope?.scoped && school.id !== scope.schoolId) {
      return { success: false, status: 404, error: "School not found" };
    }
    return { success: true, data: school };
  },

  async getHierarchy(scope) {
    // Scoped callers see only their school's tree.
    const data = await OrganizationRepository.getHierarchy(
      scope?.scoped ? scope.schoolId : null
    );
    return { success: true, data };
  },

  async createSchool(scope, schoolData, createdBy) {
    // Service-layer write restriction: only super_admin may create schools.
    if (scope?.role !== "super_admin") {
      return { success: false, status: 403, error: "Only a super admin can create schools" };
    }
    if (!schoolData.name?.trim()) {
      return { success: false, status: 400, error: "School name is required" };
    }
    if (!schoolData.code?.trim()) {
      return { success: false, status: 400, error: "School code is required" };
    }
    if (schoolData.name.length > 255) {
      return { success: false, status: 400, error: "School name must be less than 255 characters" };
    }

    const byName = await OrganizationRepository.findSchoolByName(schoolData.name.trim());
    if (byName) return { success: false, status: 409, error: "A school with this name already exists" };
    const byCode = await OrganizationRepository.findSchoolByCode(schoolData.code.trim());
    if (byCode) return { success: false, status: 409, error: "A school with this code already exists" };

    try {
      const id = await OrganizationRepository.createSchool(
        {
          name: schoolData.name.trim(),
          code: schoolData.code.trim(),
          description: schoolData.description || null,
          status: schoolData.status === "inactive" ? "inactive" : "active",
          feature_set: schoolData.feature_set || "both",
        },
        createdBy
      );
      const school = await OrganizationRepository.getSchoolById(id);
      return { success: true, status: 201, data: school };
    } catch (err) {
      if (isDuplicateError(err)) {
        return { success: false, status: 409, error: "A school with this name or code already exists" };
      }
      throw err;
    }
  },

  async updateSchool(scope, id, schoolData) {
    if (scope?.role !== "super_admin") {
      return { success: false, status: 403, error: "Only a super admin can edit schools" };
    }
    const existing = await OrganizationRepository.getSchoolById(id);
    if (!existing) return { success: false, status: 404, error: "School not found" };

    if (schoolData.name !== undefined) {
      if (!schoolData.name?.trim()) {
        return { success: false, status: 400, error: "School name cannot be empty" };
      }
      const byName = await OrganizationRepository.findSchoolByName(schoolData.name.trim());
      if (byName && byName.id !== Number(id)) {
        return { success: false, status: 409, error: "A school with this name already exists" };
      }
    }
    if (schoolData.code !== undefined) {
      if (!schoolData.code?.trim()) {
        return { success: false, status: 400, error: "School code cannot be empty" };
      }
      const byCode = await OrganizationRepository.findSchoolByCode(schoolData.code.trim());
      if (byCode && byCode.id !== Number(id)) {
        return { success: false, status: 409, error: "A school with this code already exists" };
      }
    }

    try {
      await OrganizationRepository.updateSchool(id, {
        name: schoolData.name?.trim(),
        code: schoolData.code?.trim(),
        description: schoolData.description !== undefined ? (schoolData.description || null) : undefined,
        status: schoolData.status !== undefined
          ? (schoolData.status === "inactive" ? "inactive" : "active")
          : undefined,
        feature_set: schoolData.feature_set !== undefined ? schoolData.feature_set : undefined,
      });
      const school = await OrganizationRepository.getSchoolById(id);
      return { success: true, data: school };
    } catch (err) {
      if (isDuplicateError(err)) {
        return { success: false, status: 409, error: "A school with this name or code already exists" };
      }
      throw err;
    }
  },

  async deleteSchool(scope, id) {
    if (scope?.role !== "super_admin") {
      return { success: false, status: 403, error: "Only a super admin can delete schools" };
    }
    const existing = await OrganizationRepository.getSchoolById(id);
    if (!existing) return { success: false, status: 404, error: "School not found" };

    const refs = await OrganizationRepository.schoolReferenceCounts(id);
    const blockers = [];
    if (refs.departments > 0) blockers.push(`${refs.departments} department(s)`);
    if (refs.users > 0) blockers.push(`${refs.users} user(s)`);
    if (refs.faculty > 0) blockers.push(`${refs.faculty} faculty record(s)`);
    if (blockers.length) {
      return {
        success: false,
        status: 409,
        error: `Cannot delete: still referenced by ${blockers.join(", ")}`,
      };
    }

    try {
      await OrganizationRepository.deleteSchool(id);
      return { success: true, data: { id: Number(id) } };
    } catch (err) {
      if (isForeignKeyError(err)) {
        return { success: false, status: 409, error: "School is still referenced by other records" };
      }
      throw err;
    }
  },

  // ── Departments ─────────────────────────────────────────

  /** Resolves the school a scoped caller may act in (super_admin: any). */
  _authorizedSchoolId(scope, requestedSchoolId) {
    if (scope?.scoped) {
      return scope.schoolId != null && Number(requestedSchoolId) === Number(scope.schoolId)
        ? scope.schoolId
        : null;
    }
    return requestedSchoolId;
  },

  async listDepartments(scope, schoolId) {
    const target = scope?.scoped ? scope.schoolId : schoolId;
    if (!target) return [];
    return OrganizationRepository.listDepartments(target);
  },

  async getDepartment(scope, id) {
    const dept = await OrganizationRepository.getDepartmentById(id);
    if (!dept) return { success: false, status: 404, error: "Department not found" };
    if (scope?.scoped && dept.school_id !== scope.schoolId) {
      return { success: false, status: 404, error: "Department not found" };
    }
    return { success: true, data: dept };
  },

  async createDepartment(scope, deptData, createdBy) {
    if (!deptData.name?.trim()) {
      return { success: false, status: 400, error: "Department name is required" };
    }
    if (!deptData.code?.trim()) {
      return { success: false, status: 400, error: "Department code is required" };
    }
    // Admin creates only within their own school, whatever the payload says.
    const schoolId = scope?.scoped
      ? scope.schoolId
      : this._authorizedSchoolId(scope, deptData.school_id);
    if (!schoolId) {
      return { success: false, status: 403, error: "Department must belong to your school" };
    }

    const name = deptData.name.trim();
    const code = deptData.code.trim();
    const byName = await OrganizationRepository.findDepartmentByName(schoolId, name);
    if (byName) return { success: false, status: 409, error: "A department with this name already exists in this school" };
    const byCode = await OrganizationRepository.findDepartmentByCode(schoolId, code);
    if (byCode) return { success: false, status: 409, error: "A department with this code already exists in this school" };

    try {
      const id = await OrganizationRepository.createDepartment(
        {
          school_id: schoolId,
          name,
          code,
          description: deptData.description || null,
          is_active: deptData.is_active === false ? 0 : 1,
        },
        createdBy
      );
      const dept = await OrganizationRepository.getDepartmentById(id);
      return { success: true, status: 201, data: dept };
    } catch (err) {
      if (isDuplicateError(err)) {
        return { success: false, status: 409, error: "A department with this name or code already exists in this school" };
      }
      throw err;
    }
  },

  async updateDepartment(scope, id, deptData) {
    const existing = await OrganizationRepository.getDepartmentById(id);
    if (!existing) return { success: false, status: 404, error: "Department not found" };
    if (scope?.scoped && existing.school_id !== scope.schoolId) {
      return { success: false, status: 404, error: "Department not found" };
    }

    if (deptData.name !== undefined) {
      if (!deptData.name?.trim()) {
        return { success: false, status: 400, error: "Department name cannot be empty" };
      }
      const byName = await OrganizationRepository.findDepartmentByName(existing.school_id, deptData.name.trim());
      if (byName && byName.id !== Number(id)) {
        return { success: false, status: 409, error: "A department with this name already exists in this school" };
      }
    }
    if (deptData.code !== undefined) {
      if (!deptData.code?.trim()) {
        return { success: false, status: 400, error: "Department code cannot be empty" };
      }
      const byCode = await OrganizationRepository.findDepartmentByCode(existing.school_id, deptData.code.trim());
      if (byCode && byCode.id !== Number(id)) {
        return { success: false, status: 409, error: "A department with this code already exists in this school" };
      }
    }

    try {
      await OrganizationRepository.updateDepartment(id, {
        name: deptData.name?.trim(),
        code: deptData.code?.trim(),
        description: deptData.description !== undefined ? (deptData.description || null) : undefined,
        is_active: deptData.is_active !== undefined ? (deptData.is_active ? 1 : 0) : undefined,
      });
      const dept = await OrganizationRepository.getDepartmentById(id);
      return { success: true, data: dept };
    } catch (err) {
      if (isDuplicateError(err)) {
        return { success: false, status: 409, error: "A department with this name or code already exists in this school" };
      }
      throw err;
    }
  },

  async deleteDepartment(scope, id) {
    const existing = await OrganizationRepository.getDepartmentById(id);
    if (!existing) return { success: false, status: 404, error: "Department not found" };
    if (scope?.scoped && existing.school_id !== scope.schoolId) {
      return { success: false, status: 404, error: "Department not found" };
    }

    const refs = await OrganizationRepository.departmentReferenceCounts(id);
    const blockers = [];
    if (refs.categories > 0) blockers.push(`${refs.categories} category(ies)`);
    if (refs.users > 0) blockers.push(`${refs.users} user(s)`);
    if (refs.faculty > 0) blockers.push(`${refs.faculty} faculty record(s)`);
    if (blockers.length) {
      return {
        success: false,
        status: 409,
        error: `Cannot delete: still referenced by ${blockers.join(", ")}`,
      };
    }

    try {
      await OrganizationRepository.deleteDepartment(id);
      return { success: true, data: { id: Number(id) } };
    } catch (err) {
      if (isForeignKeyError(err)) {
        return { success: false, status: 409, error: "Department is still referenced by other records" };
      }
      throw err;
    }
  },

  // ── Categories ──────────────────────────────────────────

  async listCategories(scope, departmentId, schoolId) {
    if (departmentId) {
      // Validate the department is inside the caller's scope.
      const deptResult = await this.getDepartment(scope, departmentId);
      if (!deptResult.success) return [];
      return OrganizationRepository.listCategories(departmentId);
    }
    const target = scope?.scoped ? scope.schoolId : schoolId;
    if (!target) return [];
    return OrganizationRepository.listCategoriesBySchool(target);
  },

  async getCategory(scope, id) {
    const cat = await OrganizationRepository.getCategoryById(id);
    if (!cat) return { success: false, status: 404, error: "Category not found" };
    if (scope?.scoped && cat.school_id !== scope.schoolId) {
      return { success: false, status: 404, error: "Category not found" };
    }
    return { success: true, data: cat };
  },

  async createCategory(scope, catData, createdBy) {
    if (!catData.name?.trim()) {
      return { success: false, status: 400, error: "Category name is required" };
    }
    if (catData.name.length > 255) {
      return { success: false, status: 400, error: "Category name must be less than 255 characters" };
    }

    // The department must exist AND belong to the caller's school.
    const deptResult = await this.getDepartment(scope, catData.department_id);
    if (!deptResult.success) {
      return deptResult.status === 404
        ? { success: false, status: 403, error: "Category must belong to a department in your school" }
        : deptResult;
    }

    const name = catData.name.trim();
    const byName = await OrganizationRepository.findCategoryByName(deptResult.data.id, name);
    if (byName) {
      return { success: false, status: 409, error: "A category with this name already exists in this department" };
    }

    try {
      const id = await OrganizationRepository.createCategory(
        {
          department_id: deptResult.data.id,
          name,
          description: catData.description || null,
          is_active: catData.is_active === false ? 0 : 1,
        },
        createdBy
      );
      const cat = await OrganizationRepository.getCategoryById(id);
      return { success: true, status: 201, data: cat };
    } catch (err) {
      if (isDuplicateError(err)) {
        return { success: false, status: 409, error: "A category with this name already exists in this department" };
      }
      throw err;
    }
  },

  async updateCategory(scope, id, catData) {
    const existing = await OrganizationRepository.getCategoryById(id);
    if (!existing) return { success: false, status: 404, error: "Category not found" };
    if (scope?.scoped && existing.school_id !== scope.schoolId) {
      return { success: false, status: 404, error: "Category not found" };
    }

    if (catData.department_id !== undefined && Number(catData.department_id) !== existing.department_id) {
      // Moving a category: target department must be in the caller's school.
      const deptResult = await this.getDepartment(scope, catData.department_id);
      if (!deptResult.success) {
        return { success: false, status: 403, error: "Target department must belong to your school" };
      }
    }
    if (catData.name !== undefined) {
      if (!catData.name?.trim()) {
        return { success: false, status: 400, error: "Category name cannot be empty" };
      }
      const targetDeptId = catData.department_id !== undefined ? Number(catData.department_id) : existing.department_id;
      const byName = await OrganizationRepository.findCategoryByName(targetDeptId, catData.name.trim());
      if (byName && byName.id !== Number(id)) {
        return { success: false, status: 409, error: "A category with this name already exists in this department" };
      }
    }

    try {
      const fields = {};
      if (catData.name !== undefined) fields.name = catData.name.trim();
      if (catData.description !== undefined) fields.description = catData.description || null;
      if (catData.is_active !== undefined) fields.is_active = catData.is_active ? 1 : 0;
      await OrganizationRepository.updateCategory(id, fields);

      if (catData.department_id !== undefined && Number(catData.department_id) !== existing.department_id) {
        await OrganizationRepository.moveCategory(id, catData.department_id);
      }
      const cat = await OrganizationRepository.getCategoryById(id);
      return { success: true, data: cat };
    } catch (err) {
      if (isDuplicateError(err)) {
        return { success: false, status: 409, error: "A category with this name already exists in this department" };
      }
      throw err;
    }
  },

  async deleteCategory(scope, id) {
    const existing = await OrganizationRepository.getCategoryById(id);
    if (!existing) return { success: false, status: 404, error: "Category not found" };
    if (scope?.scoped && existing.school_id !== scope.schoolId) {
      return { success: false, status: 404, error: "Category not found" };
    }
    await OrganizationRepository.softDeleteCategory(id);
    return { success: true, data: { id: Number(id) } };
  },

  // ── Category ↔ book assignment views ────────────────────

  async getCategoryBooks(scope, categoryId) {
    const catResult = await this.getCategory(scope, categoryId);
    if (!catResult.success) return catResult;

    const { physicalBookScopeSql, lexoraBookScopeSql } = require("./bookAccess.service");
    const bookScope = physicalBookScopeSql(scope);
    const lexoraScope = lexoraBookScopeSql(scope);

    const [books, lexoraBooks] = await Promise.all([
      OrganizationRepository.listBooksForCategory(categoryId, bookScope.sql, bookScope.params),
      OrganizationRepository.listLexoraBooksForCategory(categoryId, lexoraScope.sql, lexoraScope.params),
    ]);
    return { success: true, data: { books, lexoraBooks } };
  },

  /**
   * Current category ids of a physical book — read-side counterpart of
   * setBookCategories so the assignment controls can seed their selection.
   * Out-of-scope books answer 404 (no existence leak), same as the scope
   * predicate on every other book read.
   */
  async getBookCategories(scope, bookId) {
    const bookAccess = require("./bookAccess.service");
    const access = await bookAccess.isPhysicalBookAccessible(scope, bookId);
    if (!access.success) return { success: false, status: 500, error: access.error };
    if (!access.accessible) return { success: false, status: 404, error: "Book not found" };

    const categoryIds = await OrganizationRepository.getBookCategoryIds(bookId);
    return { success: true, data: { categoryIds } };
  },

  /** Current category ids of a digital book (same contract as above). */
  async getLexoraBookCategories(scope, lexoraBookId) {
    const bookAccess = require("./bookAccess.service");
    const access = await bookAccess.isLexoraBookAccessible(scope, lexoraBookId);
    if (!access.success) return { success: false, status: 500, error: access.error };
    if (!access.accessible) return { success: false, status: 404, error: "Book not found" };

    const categoryIds = await OrganizationRepository.getLexoraBookCategoryIds(lexoraBookId);
    return { success: true, data: { categoryIds } };
  },
  /**
   * Bulk-assign many books (physical or digital) to one category in a
   * single idempotent operation — filter-driven ("everything matching
   * these filters") or explicit ids. The category must belong to the
   * caller's authorized school, the same invariant (and the same
   * school-scoped JOIN) every other category write uses.
   */
  async assignCategoryBooks(scope, categoryId, payload, assignedBy) {
    const validation = require("./organization.validation");
    const error = validation.validateBulkAssignPayload(payload);
    if (error) return { success: false, status: 400, error };

    if (scope?.scoped && !scope.schoolId) {
      return { success: false, status: 403, error: "No authorized school for this action" };
    }

    // Invariant 4: the category must exist (not soft-deleted) and its
    // department must belong to the caller's school when scoped.
    const category = await OrganizationRepository.getCategoryById(categoryId);
    if (!category || (scope?.scoped && category.school_id !== scope.schoolId)) {
      return { success: false, status: 404, error: "Category not found" };
    }

    const isDryRun = Boolean(payload.dry_run);
    let counts;

    if (payload.mode === "ids") {
      if (isDryRun) {
        counts = { matched: new Set((payload.book_ids || []).map(Number)).size, assigned: 0 };
      } else {
        counts = await OrganizationRepository.assignBooksByIds(
          categoryId,
          payload.book_ids,
          assignedBy,
          payload.type
        );
      }
    } else {
      // Filter mode: count first (preview + cap guard), then insert only
      // when this is a real run — the dry run never writes.
      const counted = await OrganizationRepository.countBooksMatching(
        payload.filters || {},
        payload.exclude_ids || [],
        payload.type,
        categoryId
      );
      if (counted.matched > validation.MAX_BULK_MATCHES) {
        return {
          success: false,
          status: 400,
          error: `Too many books match (${counted.matched}). Narrow the filters to ${validation.MAX_BULK_MATCHES} matches or fewer.`,
        };
      }
      if (isDryRun) {
        return {
          success: true,
          data: {
            matched: counted.matched,
            already_assigned: counted.already_assigned,
            assigned: 0,
            skipped: Math.max(0, counted.matched - counted.already_assigned),
            dry_run: true,
          },
        };
      }
      counts = {
        matched: counted.matched,
        assigned: (
          await OrganizationRepository.assignBooksByFilter(
            categoryId,
            payload.filters || {},
            payload.exclude_ids || [],
            assignedBy,
            payload.type
          )
        ).assigned,
      };
    }

    // Dry run reports the counts without writing anything.
    if (payload.dry_run) {
      return {
        success: true,
        data: { matched: counts.matched, assigned: 0, skipped: counts.matched, dry_run: true },
      };
    }

    return {
      success: true,
      data: {
        matched: counts.matched,
        assigned: counts.assigned,
        skipped: Math.max(0, counts.matched - counts.assigned),
        dry_run: false,
      },
    };
  },

  async setBookCategories(scope, bookId, categoryIds, assignedBy) {
    const bookAccess = require("./bookAccess.service");
    return bookAccess.setPhysicalBookCategories(bookId, categoryIds, assignedBy, scope);
  },
  async setLexoraBookCategories(scope, lexoraBookId, categoryIds, assignedBy) {
    const bookAccess = require("./bookAccess.service");
    return bookAccess.setLexoraBookCategories(lexoraBookId, categoryIds, assignedBy, scope);
  },
};

module.exports = OrganizationService;
