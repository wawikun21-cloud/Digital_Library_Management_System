import { describe, it, expect } from "vitest"
import { resolveReaderPermissions } from "./readerPermissions"

describe("resolveReaderPermissions", () => {
  it("respects the stored flags for students", () => {
    expect(resolveReaderPermissions({ allowTextCopy: true, allowScreenshot: true }))
      .toEqual({ allowTextCopy: true, allowScreenshot: true })
    expect(resolveReaderPermissions({ allowTextCopy: false, allowScreenshot: true }))
      .toEqual({ allowTextCopy: false, allowScreenshot: true })
    expect(resolveReaderPermissions({ allowTextCopy: true, allowScreenshot: false }))
      .toEqual({ allowTextCopy: true, allowScreenshot: false })
    expect(resolveReaderPermissions({ allowTextCopy: false, allowScreenshot: false }))
      .toEqual({ allowTextCopy: false, allowScreenshot: false })
  })

  it("defaults to allowed when a flag is missing", () => {
    expect(resolveReaderPermissions()).toEqual({ allowTextCopy: true, allowScreenshot: true })
    expect(resolveReaderPermissions({}))
      .toEqual({ allowTextCopy: true, allowScreenshot: true })
    expect(resolveReaderPermissions({ allowTextCopy: undefined }))
      .toEqual({ allowTextCopy: true, allowScreenshot: true })
  })

  it("lets managers bypass a restriction so they can inspect their books", () => {
    expect(resolveReaderPermissions({ allowTextCopy: false, allowScreenshot: false, canManage: true }))
      .toEqual({ allowTextCopy: true, allowScreenshot: true })
  })

  it("does not bypass for non-managers even with an explicit false", () => {
    const result = resolveReaderPermissions({ allowTextCopy: false, allowScreenshot: false, canManage: false })
    expect(result.allowTextCopy).toBe(false)
    expect(result.allowScreenshot).toBe(false)
  })
})
