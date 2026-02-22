"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import type { MergedAsset } from "./page";

type Props = {
  assets: MergedAsset[];
  sectionOrder: string[];
};

function getFolderPath(relativePath: string): string {
  return relativePath.includes("/") ? relativePath.replace(/\/[^/]+$/, "") : "";
}

function toSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function AssetGallery({ assets, sectionOrder }: Props) {
  const rootOrder = sectionOrder;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  const sections: {
    root: string;
    folderPath: string;
    heading: string;
    id: string;
    items: MergedAsset[];
  }[] = useMemo(() => {
    const out: {
      root: string;
      folderPath: string;
      heading: string;
      id: string;
      items: MergedAsset[];
    }[] = [];
    for (const root of rootOrder) {
      const rootAssets = assets.filter((a) => a.rootFolder === root);
      const byFolder = new Map<string, MergedAsset[]>();
      for (const item of rootAssets) {
        const folderPath = getFolderPath(item.relativePath);
        if (!byFolder.has(folderPath)) byFolder.set(folderPath, []);
        byFolder.get(folderPath)!.push(item);
      }
      const folderPaths = Array.from(byFolder.keys()).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      );
      for (const folderPath of folderPaths) {
        const heading = folderPath ? `${root} / ${folderPath}` : root;
        const id = toSlug(heading);
        out.push({
          root,
          folderPath,
          heading,
          id,
          items: byFolder.get(folderPath)!,
        });
      }
    }
    return out;
  }, [assets, rootOrder]);

  const handleSectionClick = useCallback((id: string) => {
    const el = sectionRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    const ids = sections.map((s) => s.id);
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) sectionRefs.current.set(id, el);
    });

    const onScroll = () => {
      const viewportTop = window.scrollY + 120;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= viewportTop) current = id;
      }
      if (current) setActiveId(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const highlightedId = hoveredId ?? activeId;

  return (
    <div className="relative">
      {/* Backdrop - only when sidebar open; tap to close */}
      <div
        aria-hidden
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-20 transition-opacity duration-200 ${
          sidebarOpen ? "bg-black/40 opacity-100" : "pointer-events-none bg-transparent opacity-0"
        }`}
      />

      {/* Open button - only when sidebar is closed */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-24 z-30 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#e7e5e4] bg-white p-0 shadow-md transition-colors hover:border-[#d6d3d1] hover:bg-[#fafaf9]"
          aria-label="Open sections"
        >
          <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      )}

      {/* Sidebar - responsive drawer; close button inside header */}
      <aside
        className={`fixed left-0 top-0 z-20 flex h-full w-72 max-w-[calc(100vw-3rem)] flex-col border-r border-[#e7e5e4] bg-white/95 shadow-xl backdrop-blur-sm transition-transform duration-200 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#e7e5e4] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[#78716c]">
            Sections
          </p>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#57534e] transition-colors hover:bg-[#f5f5f4] hover:text-[#44403c]"
            aria-label="Close sections"
          >
            <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pl-4 pr-3 py-4 pb-8">
          <ul className="mt-1 space-y-0.5">
            {sections.map(({ id, heading }) => {
              const isHighlight = highlightedId === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => handleSectionClick(id)}
                    onMouseEnter={() => setHoveredId(id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`flex w-full items-center gap-2 rounded-lg py-2 pl-0 pr-2 text-left text-sm transition-all duration-200 ease-out ${
                      isHighlight ? "text-[#0ea5e9]" : "text-[#57534e] hover:text-[#44403c]"
                    }`}
                  >
                    <span
                      className={`h-px shrink-0 transition-all duration-200 ease-out ${
                        isHighlight ? "w-8 bg-[#0ea5e9]" : "w-1.5 bg-[#a8a29e]"
                      }`}
                      aria-hidden
                    />
                    <span className={`min-w-0 truncate transition-transform duration-200 ease-out ${isHighlight ? "translate-x-0.5" : "translate-x-0"}`}>
                      {heading}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex flex-col gap-14 pl-14">
        {sections.map(({ id, heading, items }) => (
          <section key={id} id={id} className="scroll-mt-8">
            <h2 className="mb-5 text-left text-lg font-medium text-[#44403c]">
              {heading}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((item) => (
                <article
                  key={`${item.rootFolder}-${item.relativePath}`}
                  className="group overflow-hidden rounded-xl border border-[#e7e5e4] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[#d6d3d1] hover:shadow-md"
                >
                  <div className="relative aspect-square flex items-center justify-center bg-[#fafaf9] p-4">
                    <Image
                      src={item.previewUrl}
                      alt={item.baseName}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      className="object-contain p-2 transition group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>
                  <div className="border-t border-[#e7e5e4] px-3 py-2">
                    <p
                      className="truncate text-xs font-medium text-[#44403c]"
                      title={item.baseName}
                    >
                      {item.baseName}
                    </p>
                    <p
                      className="truncate text-[11px] text-[#78716c]"
                      title={item.relativePath}
                    >
                      {item.relativePath}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.variants.map((v) => (
                        <a
                          key={v.extension}
                          href={v.publicUrl}
                          download
                          className={`inline-flex items-center rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                            v.extension === "svg"
                              ? "bg-[#e0f2fe] text-[#0369a1] hover:bg-[#bae6fd]"
                              : v.extension === "png"
                                ? "bg-[#dcfce7] text-[#15803d] hover:bg-[#bbf7d0]"
                                : "bg-[#f5f5f4] text-[#57534e] hover:bg-[#e7e5e4]"
                          }`}
                        >
                          Download {v.extension}
                        </a>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
