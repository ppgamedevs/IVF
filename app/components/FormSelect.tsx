"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps {
  id: string;
  label: string;
  placeholder: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  errorId?: string;
  required?: boolean;
}

export default function FormSelect({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  error,
  errorId,
  required = false,
}: FormSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [focusIdx, setFocusIdx] = useState(-1);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const close = useCallback(() => {
    setOpen(false);
    setFocusIdx(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, close]);

  useEffect(() => {
    if (open && focusIdx >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[role='option']");
      (items[focusIdx] as HTMLElement)?.scrollIntoView({ block: "nearest" });
    }
  }, [focusIdx, open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
        const idx = options.findIndex((o) => o.value === value);
        setFocusIdx(idx >= 0 ? idx : 0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusIdx((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusIdx((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusIdx >= 0 && focusIdx < options.length) {
          onChange(options[focusIdx].value);
          close();
          buttonRef.current?.focus();
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        buttonRef.current?.focus();
        break;
      case "Tab":
        close();
        break;
    }
  }

  function select(val: string) {
    onChange(val);
    close();
    buttonRef.current?.focus();
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-medical-text mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
        <button
          ref={buttonRef}
          id={id}
          type="button"
          onClick={() => { if (!disabled) setOpen(!open); }}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`w-full px-4 py-3 rounded-xl border bg-white text-left text-base transition-colors duration-200 flex items-center justify-between gap-2 ${
            error ? "border-red-300" : open ? "border-primary-400" : "border-medical-border"
          } ${!value ? "text-medical-muted/60" : "text-medical-heading"} ${
            disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
          }`}
          style={open ? { boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.15)" } : undefined}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <svg
            className={`w-4 h-4 flex-shrink-0 text-medical-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {open && (
          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            aria-labelledby={id}
            className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-medical-border bg-white shadow-lg shadow-black/8 py-1"
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isFocused = idx === focusIdx;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setFocusIdx(idx)}
                  onMouseDown={(e) => { e.preventDefault(); select(opt.value); }}
                  className={`px-4 py-3 text-base cursor-pointer transition-colors duration-100 ${
                    isFocused ? "bg-primary-50 text-primary-700" : "text-medical-heading"
                  } ${isSelected ? "font-semibold" : "font-normal"}`}
                >
                  <span className="flex items-center justify-between">
                    {opt.label}
                    {isSelected && (
                      <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {error && <p id={errorId} role="alert" className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
