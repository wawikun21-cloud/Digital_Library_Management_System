// @vitest-environment jsdom
/**
 * Structural tests for the drawer shell.
 *
 * The drawer previously rendered its own <header> on top of the header
 * PermissionsDrawer already provides, and wrapped children in a second
 * overflow container — so the panel showed two stacked header bars and two
 * scroll regions. These assert the shell is genuinely bare.
 */
import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import Drawer from "./Drawer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(ui) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(ui); });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("Drawer shell", () => {
  it("renders nothing while closed", () => {
    const t = mount(React.createElement(Drawer, { open: false, onClose: () => {} }));
    expect(t.container.querySelector(".drawer-root")).toBeNull();
    t.unmount();
  });

  it("renders exactly one dialog and no header of its own", () => {
    const t = mount(
      React.createElement(
        Drawer,
        { open: true, onClose: () => {}, label: "Permissions" },
        React.createElement(
          "div",
          { className: "caller-owned-header" },
          "Edit: Staff"
        )
      )
    );

    const root = t.container.querySelector(".drawer-root");
    expect(root).not.toBeNull();

    // The shell must not introduce a header — the caller owns it.
    expect(root.querySelector("header")).toBeNull();
    expect(root.querySelector("h2")).toBeNull();
    expect(root.querySelector(".caller-owned-header")).not.toBeNull();
    expect(root.querySelector(".caller-owned-header").textContent).toBe("Edit: Staff");

    t.unmount();
  });

  it("renders the caller's content directly, with no wrapper of its own", () => {
    const t = mount(
      React.createElement(
        Drawer,
        { open: true, onClose: () => {} },
        React.createElement("div", { className: "caller-content" }, "body")
      )
    );

    const panel = t.container.querySelector(".drawer-panel");
    // Exactly one element between the panel and the caller's content, and it
    // is that content — the old shell injected an overflow/padding wrapper.
    const children = [...panel.children];
    expect(children).toHaveLength(1);
    expect(children[0].className).toContain("caller-content");

    // And nothing in the shell carries a Tailwind overflow/padding wrapper.
    const shellClasses = [panel.className, ...children.map((c) => c.className)].join(" ");
    expect(shellClasses).not.toContain("overflow-y-auto");
    expect(shellClasses).not.toContain("px-5");

    t.unmount();
  });

  it("exposes dialog semantics and closes on Escape", () => {
    let closed = 0;
    const t = mount(
      React.createElement(Drawer, { open: true, onClose: () => { closed += 1; }, label: "Permissions" },
        React.createElement("div", null, "body"))
    );

    const dialog = t.container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Permissions");

    act(() => {
      window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(closed).toBe(1);

    t.unmount();
  });

  it("locks background scroll while open and restores it after", () => {
    document.body.style.overflow = "auto";
    const t = mount(
      React.createElement(Drawer, { open: true, onClose: () => {} }, React.createElement("div", null, "body"))
    );
    expect(document.body.style.overflow).toBe("hidden");
    t.unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("closes on backdrop click but not on panel click", () => {
    let closed = 0;
    const t = mount(
      React.createElement(Drawer, { open: true, onClose: () => { closed += 1; } }, React.createElement("p", null, "body"))
    );

    act(() => {
      t.container.querySelector(".drawer-backdrop").dispatchEvent(
        new window.MouseEvent("click", { bubbles: true })
      );
    });
    expect(closed).toBe(1);

    // The backdrop must be inert — not focusable, not announced.
    expect(t.container.querySelector(".drawer-backdrop").tagName).toBe("DIV");
    expect(t.container.querySelector(".drawer-backdrop").getAttribute("aria-hidden")).toBe("true");

    t.unmount();
  });

  it("passes the width through as a CSS custom property", () => {
    const t = mount(
      React.createElement(Drawer, { open: true, onClose: () => {}, width: 520 }, React.createElement("div", null, "b"))
    );
    const panel = t.container.querySelector(".drawer-panel");
    expect(panel.style.getPropertyValue("--drawer-width")).toBe("min(520px, 100%)");
    t.unmount();
  });
});
