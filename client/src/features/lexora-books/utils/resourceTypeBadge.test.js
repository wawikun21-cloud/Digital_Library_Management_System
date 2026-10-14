import { describe, it, expect } from "vitest"
import { resourceTypeBadgeStyle } from "./resourceTypeBadge"

describe("resourceTypeBadgeStyle", () => {
  it("gives the seeded types distinct treatments", () => {
    const open = resourceTypeBadgeStyle("Open Source")
    const premium = resourceTypeBadgeStyle("Premium")
    expect(open.color).toBe("#246139")
    expect(premium.color).toBe("#996500")
    expect(open.background).not.toBe(premium.background)
  })

  it("matches case-insensitively and ignores surrounding spaces", () => {
    expect(resourceTypeBadgeStyle("  open source ")).toEqual(resourceTypeBadgeStyle("Open Source"))
    expect(resourceTypeBadgeStyle("PREMIUM")).toEqual(resourceTypeBadgeStyle("Premium"))
  })

  it("falls back to the neutral primary tint for user-created types", () => {
    expect(resourceTypeBadgeStyle("Institutional")).toEqual({
      background: "rgba(50,102,127,0.12)",
      color: "#32667F",
    })
  })

  it("falls back for empty values so a missing badge still renders sanely", () => {
    expect(resourceTypeBadgeStyle("")).toEqual(resourceTypeBadgeStyle("Institutional"))
    expect(resourceTypeBadgeStyle(undefined)).toEqual(resourceTypeBadgeStyle("Institutional"))
    expect(resourceTypeBadgeStyle(null)).toEqual(resourceTypeBadgeStyle("Institutional"))
  })
})
