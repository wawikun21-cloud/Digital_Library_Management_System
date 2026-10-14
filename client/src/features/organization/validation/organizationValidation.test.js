import { describe, it, expect } from "vitest";
import {
  validateSchoolPayload,
  validateDepartmentPayload,
  validateCategoryPayload,
} from "./organizationValidation";

// These validators receive FORM state, whose keys mirror the server
// payload (snake_case). A previous version destructured camelCase
// (schoolId / departmentId), so the required-school error fired even
// after a selection — the department form could never be submitted.
// These cases pin the form shape end to end.

describe("validateSchoolPayload", () => {
  it("accepts name + code", () => {
    expect(validateSchoolPayload({ name: "North Campus", code: "NC" }).isValid).toBe(true);
  });

  it("rejects missing name or code", () => {
    const { errors, isValid } = validateSchoolPayload({ name: "", code: "" });
    expect(isValid).toBe(false);
    expect(errors.name).toBeTruthy();
    expect(errors.code).toBeTruthy();
  });
});

describe("validateDepartmentPayload (form shape)", () => {
  const base = { name: "College of Information Technology", code: "CIT" };

  it("accepts a selected school_id as a number", () => {
    expect(validateDepartmentPayload({ ...base, school_id: 3 }).isValid).toBe(true);
  });

  it("accepts a selected school_id as a numeric string (select value)", () => {
    expect(validateDepartmentPayload({ ...base, school_id: "3" }).isValid).toBe(true);
  });

  it("rejects an empty school_id with the selector message", () => {
    const { errors, isValid } = validateDepartmentPayload({ ...base, school_id: "" });
    expect(isValid).toBe(false);
    expect(errors.school_id).toBe("Select the school this department belongs to");
  });

  it("rejects a missing school_id key", () => {
    expect(validateDepartmentPayload({ ...base }).isValid).toBe(false);
  });
});

describe("validateCategoryPayload (form shape)", () => {
  it("accepts a selected department_id as a number", () => {
    expect(validateCategoryPayload({ name: "Reference", department_id: 7 }).isValid).toBe(true);
  });

  it("accepts a selected department_id as a numeric string", () => {
    expect(validateCategoryPayload({ name: "Reference", department_id: "7" }).isValid).toBe(true);
  });

  it("rejects an empty department_id with the selector message", () => {
    const { errors, isValid } = validateCategoryPayload({ name: "Reference", department_id: "" });
    expect(isValid).toBe(false);
    expect(errors.department_id).toBe("Select the department this category belongs to");
  });

  it("rejects a missing department_id key", () => {
    expect(validateCategoryPayload({ name: "Reference" }).isValid).toBe(false);
  });
});
