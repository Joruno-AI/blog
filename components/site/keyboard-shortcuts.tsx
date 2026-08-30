"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteIcon } from "@/components/site/site-icon";

function isInputActive() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  const tag = active.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || active.getAttribute("contenteditable") === "true";
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pendingKey = useRef<string | null>(null);
  const pendingTimer = useRef(0);

  useEffect(() => {
    if (open) requestAnimationFrame(() => closeRef.current?.focus());
  }, [open]);

  useEffect(() => {
    const clearPending = () => {
      pendingKey.current = null;
      if (pendingTimer.current) window.clearTimeout(pendingTimer.current);
      pendingTimer.current = 0;
    };
    const closePanels = () => {
      setOpen(false);
      const searchPanel = document.getElementById("search-panel");
      if (searchPanel && !searchPanel.classList.contains("hidden")) {
        document.getElementById("search-close-button")?.click();
      }
      const navButton = document.getElementById("nav-open-button");
      if (navButton?.getAttribute("aria-expanded") === "true") navButton.click();
    };
    const onKey = (event: KeyboardEvent) => {
      if (isInputActive()) return;
      const key = event.key.toLowerCase();
      const isMeta = event.metaKey || event.ctrlKey;
      if (open) {
        if (key === "escape") {
          event.preventDefault();
          closePanels();
        }
        return;
      }
      if (isMeta && key === "k") {
        event.preventDefault();
        document.getElementById("search-switch")?.click();
        return;
      }
      if (key === "/" && !isMeta && !event.shiftKey) {
        event.preventDefault();
        document.getElementById("search-switch")?.click();
        return;
      }
      if (key === "escape") {
        closePanels();
        return;
      }
      if (event.shiftKey && (key === "/" || key === "?")) {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (key === "t" && !isMeta && !event.shiftKey) {
        event.preventDefault();
        document.getElementById("theme-switch")?.click();
        return;
      }
      if (key === "g" && !isMeta && !event.shiftKey) {
        clearPending();
        pendingKey.current = "g";
        pendingTimer.current = window.setTimeout(clearPending, 500);
        return;
      }
      if (pendingKey.current === "g") {
        clearPending();
        if (key === "h") {
          event.preventDefault();
          router.push("/");
        } else if (key === "b") {
          event.preventDefault();
          router.push("/blog");
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearPending();
    };
  }, [open, router]);

  if (!open) return null;

  return (
    <div
      id="shortcuts-help"
      className="shortcuts-help"
      role="dialog"
      aria-modal="true"
      aria-label="键盘快捷键"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) setOpen(false);
      }}
    >
      <div className="shortcuts-help-card">
        <div className="shortcuts-help-header">
          <h2>键盘快捷键</h2>
          <button ref={closeRef} id="close-shortcuts-help" type="button" aria-label="关闭" onClick={() => setOpen(false)}><SiteIcon name="close-line" /></button>
        </div>
        <div className="shortcuts-help-list">
          <Shortcut label="搜索"><Kbd>/</Kbd> 或 <Kbd>⌘</Kbd><Kbd>K</Kbd></Shortcut>
          <Shortcut label="回到首页"><Kbd>G</Kbd> <Kbd>H</Kbd></Shortcut>
          <Shortcut label="博客列表"><Kbd>G</Kbd> <Kbd>B</Kbd></Shortcut>
          <Shortcut label="切换主题"><Kbd>T</Kbd></Shortcut>
          <Shortcut label="关闭弹窗"><Kbd>Esc</Kbd></Shortcut>
          <Shortcut label="显示帮助"><Kbd>?</Kbd></Shortcut>
        </div>
        <p className="shortcuts-help-tip">按 <Kbd>Esc</Kbd> 关闭此窗口</p>
      </div>
    </div>
  );
}

function Shortcut({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="shortcut-row"><div>{label}</div><div>{children}</div></div>;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
