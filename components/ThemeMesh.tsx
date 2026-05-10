"use client";

import { useLayoutEffect, useState } from "react";

/**
 * Reads --theme-mesh-a/b from <html> after paint and when data-theme changes.
 * Inline var() on blurred layers can fail to repaint in some browsers until
 * reload; resolved colors force an update.
 */
export function ThemeMesh() {
  const [mesh, setMesh] = useState({ a: "transparent", b: "transparent" });

  useLayoutEffect(() => {
    const root = document.documentElement;
    function sync() {
      const cs = getComputedStyle(root);
      setMesh({
        a: cs.getPropertyValue("--theme-mesh-a").trim() || "transparent",
        b: cs.getPropertyValue("--theme-mesh-b").trim() || "transparent",
      });
    }
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div
        className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full blur-[120px] transition-[background-color] duration-700"
        style={{ backgroundColor: mesh.a }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full blur-[150px] transition-[background-color] duration-700"
        style={{ backgroundColor: mesh.b }}
      />
    </div>
  );
}
