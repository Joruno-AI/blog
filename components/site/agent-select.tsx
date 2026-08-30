"use client";

import { createElement, useEffect, useRef, useState } from "react";

import { AgentSourceIcon } from "@/components/site/agent-source-icon";

export type AgentSelectOption = {
  value: string;
  label: string;
  icon: string;
};

/** React implementation of the production Agent `skill-select` control. */
export function AgentSelect({
  ariaLabel,
  className = "",
  value,
  options,
  onValueChange,
}: {
  ariaLabel: string;
  className?: string;
  value: string;
  options: AgentSelectOption[];
  onValueChange: (value: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return createElement(
    "skill-select",
    {
      ref: rootRef,
      className: ["skill-select", className].filter(Boolean).join(" "),
      "data-aria-label": ariaLabel,
      "data-ready": ready ? "" : undefined,
      "data-open": open ? "" : undefined,
    },
    <select
      className="skill-select-native"
      aria-label={ariaLabel}
      aria-hidden={ready || undefined}
      tabIndex={ready ? -1 : undefined}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
    </select>,
    <div className="skill-select-ui">
      <button
        className="skill-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${ariaLabel}：${selected.label}`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="skill-select-current"><span className="skill-select-icon"><AgentSourceIcon name={selected.icon} /></span><span>{selected.label}</span></span>
        <AgentSourceIcon name="i-ri-arrow-down-s-line" />
      </button>
      <div className="skill-select-menu" role="listbox" aria-label={ariaLabel}>
        {options.map((option) => <button
          className="skill-select-option"
          type="button"
          role="option"
          aria-selected={option.value === value}
          onClick={() => { onValueChange(option.value); setOpen(false); }}
          key={option.value}
        >
          <span className="skill-select-option-main"><span className="skill-select-icon"><AgentSourceIcon name={option.icon} /></span><span>{option.label}</span></span>
          <AgentSourceIcon name="i-ri-check-line" />
        </button>)}
      </div>
    </div>,
  );
}
