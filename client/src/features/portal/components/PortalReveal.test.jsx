// @vitest-environment jsdom
/**
 * PortalReveal: hidden-until-observed and replay-on-retry semantics.
 *
 * The reveal wrapper keeps cards at opacity 0 until an IntersectionObserver
 * reports them visible, and StudentPortalPage keys it on the hook's retry
 * counter so a failed-then-retried section animates again instead of
 * popping in at full opacity. These pin both halves: the observer must gate
 * visibility, and a key change must start from hidden again.
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import PortalReveal from "./PortalReveal";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Controllable stand-in: tests fire the callback by hand. */
class FakeIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.observed = [];
    this.disconnected = false;
    FakeIntersectionObserver.live.push(this);
  }
  observe(node) { this.observed.push(node); }
  disconnect() { this.disconnected = true; }
  static get last() { return FakeIntersectionObserver.live[FakeIntersectionObserver.live.length - 1]; }
  static reset() { FakeIntersectionObserver.live = []; }
}
FakeIntersectionObserver.live = [];

function mount(ui) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(ui); });
  return {
    container,
    rerender(next) { act(() => { root.render(next); }); },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function isVisible(container) {
  const reveal = container.querySelector(".portal-reveal");
  return !!reveal && reveal.classList.contains("is-visible");
}

/** Mirrors StudentPortalPage: a retry bumps the key. */
function PortalSectionHost({ attempt }) {
  return (
    <PortalReveal key={`books-${attempt}`} className="grid">
      <span>card</span>
    </PortalReveal>
  );
}

beforeEach(() => {
  FakeIntersectionObserver.reset();
  globalThis.IntersectionObserver = FakeIntersectionObserver;
  window.matchMedia = undefined; // no prefers-reduced-motion in jsdom by default
});

afterEach(() => {
  document.body.innerHTML = "";
  delete globalThis.IntersectionObserver;
});

describe("PortalReveal", () => {
  it("keeps children hidden until the observer reports them visible", () => {
    const t = mount(<PortalReveal className="grid"><span>card</span></PortalReveal>);
    expect(isVisible(t.container)).toBe(false);

    act(() => { FakeIntersectionObserver.last.callback([{ isIntersecting: true }]); });
    expect(isVisible(t.container)).toBe(true);
    t.unmount();
  });

  it("stops observing after the first reveal", () => {
    const t = mount(<PortalReveal><span>card</span></PortalReveal>);
    const observer = FakeIntersectionObserver.last;

    act(() => { observer.callback([{ isIntersecting: true }]); });
    expect(observer.disconnected).toBe(true);
    t.unmount();
  });

  it("replays the reveal when remounted with a new key (retry)", () => {
    const t = mount(<PortalSectionHost attempt={0} />);
    act(() => { FakeIntersectionObserver.last.callback([{ isIntersecting: true }]); });
    expect(isVisible(t.container)).toBe(true);
    const firstObserver = FakeIntersectionObserver.last;

    // Retry: new key → fresh mount, back to hidden, old observer released.
    t.rerender(<PortalSectionHost attempt={1} />);
    expect(isVisible(t.container)).toBe(false);
    expect(firstObserver.disconnected).toBe(true);

    act(() => { FakeIntersectionObserver.last.callback([{ isIntersecting: true }]); });
    expect(isVisible(t.container)).toBe(true);
    t.unmount();
  });

  it("shows content immediately when IntersectionObserver is unavailable", () => {
    delete globalThis.IntersectionObserver;
    const t = mount(<PortalReveal><span>card</span></PortalReveal>);
    expect(isVisible(t.container)).toBe(true);
    t.unmount();
  });

  it("shows content immediately under prefers-reduced-motion", () => {
    window.matchMedia = (query) => ({
      matches: query.includes("reduce"),
      addEventListener() {},
      removeEventListener() {},
    });
    const t = mount(<PortalReveal><span>card</span></PortalReveal>);
    expect(isVisible(t.container)).toBe(true);
    t.unmount();
  });
});
