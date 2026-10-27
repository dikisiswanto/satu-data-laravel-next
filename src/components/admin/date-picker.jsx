"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_FORMAT = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});
const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function DatePicker({
  id,
  name,
  defaultValue = "",
  value: controlledValue,
  placeholder = "Pilih tanggal",
  disabled = false,
  invalid = false,
  describedBy,
  min,
  max,
  onChangeValue,
  onValueChange,
}) {
  const [localValue, setLocalValue] = useState(defaultValue || "");
  const value =
    controlledValue === undefined ? localValue : controlledValue || "";
  const todayISO = toISODate(new Date());
  const fallbackISO =
    min && todayISO < min ? min : max && todayISO > max ? max : todayISO;
  const initialISO =
    defaultValue &&
    (!min || defaultValue >= min) &&
    (!max || defaultValue <= max)
      ? defaultValue
      : fallbackISO;
  const [open, setOpen] = useState(false);
  const [focusedISO, setFocusedISO] = useState(() => initialISO);
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const dayButtonRefs = useRef(new Map());
  const restoreTriggerFocusRef = useRef(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = parseDate(initialISO) || new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const selectedDate = parseDate(value);
  const isDateAllowed = (iso) => (!min || iso >= min) && (!max || iso <= max);
  const calendarDays = useMemo(() => {
    const first = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    );
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + index,
      );
      return {
        date,
        iso: toISODate(date),
        inMonth: date.getMonth() === visibleMonth.getMonth(),
      };
    });
  }, [visibleMonth]);

  const isOpen = open && !disabled;

  // Render the calendar at document.body so overflow:auto/hidden ancestors do
  // not clip it. The popup itself uses viewport-fixed coordinates calculated
  // from the trigger, following the usual popover/combobox positioning model.
  // The picker starts closed, so document.body is only read after user input.
  useBrowserLayoutEffect(() => {
    if (!isOpen) return undefined;

    const updatePlacement = () => {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) return;

      const root = document.documentElement;
      const viewportWidth = root.clientWidth || window.innerWidth;
      const viewportHeight = window.innerHeight || root.clientHeight;
      const triggerRect = trigger.getBoundingClientRect();
      const viewportGutter = 12;
      const gap = 8;
      const anchorOutsideViewport =
        triggerRect.bottom < viewportGutter ||
        triggerRect.top > viewportHeight - viewportGutter ||
        triggerRect.right < viewportGutter ||
        triggerRect.left > viewportWidth - viewportGutter;
      if (anchorOutsideViewport) {
        popover.style.visibility = "hidden";
        return;
      }
      popover.style.visibility = "visible";
      const maxPopupWidth = Math.max(0, viewportWidth - viewportGutter * 2);
      const maxViewportHeight = Math.max(
        0,
        viewportHeight - viewportGutter * 2,
      );

      popover.style.position = "fixed";
      popover.style.right = "auto";
      popover.style.maxWidth = `${maxPopupWidth}px`;

      // Measure after width constraints have been applied. scrollHeight keeps
      // the full content height available even when this popup was constrained
      // during a previous placement pass.
      const popupRect = popover.getBoundingClientRect();
      const popupWidth = Math.min(popupRect.width, maxPopupWidth);
      const naturalHeight = Math.max(popover.scrollHeight, popupRect.height);
      const spaceBelow = Math.max(
        0,
        viewportHeight - viewportGutter - triggerRect.bottom - gap,
      );
      const spaceAbove = Math.max(0, triggerRect.top - viewportGutter - gap);
      const side =
        naturalHeight <= spaceBelow || spaceBelow >= spaceAbove
          ? "bottom"
          : "top";
      const availableHeight = Math.min(
        maxViewportHeight,
        side === "bottom" ? spaceBelow : spaceAbove,
      );
      popover.style.maxHeight = `${availableHeight}px`;
      popover.style.overflowY = "auto";
      popover.dataset.side = side;

      const measuredHeight = popover.getBoundingClientRect().height;
      const requestedTop =
        side === "bottom"
          ? triggerRect.bottom + gap
          : triggerRect.top - gap - measuredHeight;
      const popupTop = Math.max(
        viewportGutter,
        Math.min(
          viewportHeight - viewportGutter - measuredHeight,
          requestedTop,
        ),
      );

      const fitsStart =
        triggerRect.left + popupWidth <= viewportWidth - viewportGutter;
      const fitsEnd = triggerRect.right - popupWidth >= viewportGutter;
      let requestedLeft = triggerRect.left;
      let nextAlign = "start";
      if (!fitsStart && fitsEnd) {
        requestedLeft = triggerRect.right - popupWidth;
        nextAlign = "end";
      } else if (!fitsStart && !fitsEnd) {
        nextAlign = "clamp";
      }
      const popupLeft = Math.max(
        viewportGutter,
        Math.min(viewportWidth - viewportGutter - popupWidth, requestedLeft),
      );

      popover.style.left = `${popupLeft}px`;
      popover.style.top = `${popupTop}px`;
      if (popover.dataset.align !== nextAlign) {
        popover.dataset.align = nextAlign;
      }
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    // A body-level popup must be repositioned when any scroll container moves.
    window.addEventListener("scroll", updatePlacement, true);
    window.visualViewport?.addEventListener("resize", updatePlacement);
    window.visualViewport?.addEventListener("scroll", updatePlacement);
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updatePlacement)
        : null;
    if (triggerRef.current) resizeObserver?.observe(triggerRef.current);
    if (popoverRef.current) resizeObserver?.observe(popoverRef.current);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
      window.visualViewport?.removeEventListener("resize", updatePlacement);
      window.visualViewport?.removeEventListener("scroll", updatePlacement);
    };
  }, [isOpen, visibleMonth]);

  useEffect(() => {
    if (!disabled || !open) return undefined;
    restoreTriggerFocusRef.current = false;
    const frame = window.requestAnimationFrame(() => setOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, [disabled, open]);

  useEffect(() => {
    if (!isOpen) {
      if (restoreTriggerFocusRef.current) {
        triggerRef.current?.focus();
        restoreTriggerFocusRef.current = false;
      }
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      dayButtonRefs.current.get(focusedISO)?.focus();
    });
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        restoreTriggerFocusRef.current = true;
        setOpen(false);
      }
    }
    function handlePointerDown(event) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        pickerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      // Preserve focus on the control the user actually clicked outside.
      restoreTriggerFocusRef.current = false;
      setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [focusedISO, id, isOpen]);

  function moveMonth(amount) {
    setVisibleMonth((current) => {
      const next = new Date(
        current.getFullYear(),
        current.getMonth() + amount,
        1,
      );
      const firstISO = toISODate(next);
      const lastISO = toISODate(
        new Date(next.getFullYear(), next.getMonth() + 1, 0),
      );
      if (max && firstISO > max) return current;
      if (min && lastISO < min) return current;
      return next;
    });
  }

  function moveFocusByKeyboard(event, iso) {
    let target = parseDate(iso);
    if (!target) return;
    const key = event.key;
    if (key === "ArrowRight") target.setDate(target.getDate() + 1);
    else if (key === "ArrowLeft") target.setDate(target.getDate() - 1);
    else if (key === "ArrowDown") target.setDate(target.getDate() + 7);
    else if (key === "ArrowUp") target.setDate(target.getDate() - 7);
    else if (key === "Home")
      target.setDate(target.getDate() - ((target.getDay() + 6) % 7));
    else if (key === "End")
      target.setDate(target.getDate() + (6 - ((target.getDay() + 6) % 7)));
    else if (key === "PageUp" || key === "PageDown") {
      const direction = key === "PageUp" ? -1 : 1;
      const nextMonth = new Date(
        target.getFullYear(),
        target.getMonth() + direction,
        1,
      );
      const lastDay = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth() + 1,
        0,
      ).getDate();
      target = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        Math.min(target.getDate(), lastDay),
      );
    } else return;
    event.preventDefault();
    const nextISO = toISODate(target);
    if (!isDateAllowed(nextISO)) return;
    setFocusedISO(nextISO);
    setVisibleMonth(new Date(target.getFullYear(), target.getMonth(), 1));
  }

  function selectDate(iso) {
    const date = parseDate(iso);
    if (!date || !isDateAllowed(iso)) return;
    if (controlledValue === undefined) setLocalValue(iso);
    onValueChange?.(iso);
    onChangeValue?.();
    if (date) setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    restoreTriggerFocusRef.current = true;
    setOpen(false);
  }

  return (
    <div ref={pickerRef} className="date-picker" data-date-picker={id}>
      <input type="hidden" id={`${id}-value`} name={name} value={value} />
      <div className="date-picker-control">
        <button
          type="button"
          id={id}
          className={`field date-picker-trigger w-full border bg-white text-left shadow-sm${invalid ? " border-red-600 focus-visible:ring-red-600" : " border-[#cbd7e1]"}`}
          aria-describedby={describedBy}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={`${id}-calendar`}
          disabled={disabled}
          ref={triggerRef}
          onClick={() => {
            if (isOpen) {
              restoreTriggerFocusRef.current = true;
              setOpen(false);
            } else {
              setFocusedISO(
                selectedDate && isDateAllowed(value) ? value : fallbackISO,
              );
              const initial = parseDate(
                selectedDate && isDateAllowed(value) ? value : fallbackISO,
              );
              if (initial)
                setVisibleMonth(
                  new Date(initial.getFullYear(), initial.getMonth(), 1),
                );
              setOpen(true);
            }
          }}
        >
          <CalendarDays size={17} aria-hidden="true" />
          <span
            className={
              selectedDate ? "date-picker-value" : "date-picker-placeholder"
            }
          >
            {selectedDate
              ? DATE_FORMAT.format(
                  new Date(
                    Date.UTC(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth(),
                      selectedDate.getDate(),
                    ),
                  ),
                )
              : placeholder}
          </span>
        </button>
        {value ? (
          <button
            type="button"
            className="date-picker-clear"
            aria-label="Hapus tanggal"
            disabled={disabled}
            onClick={() => {
              if (controlledValue === undefined) setLocalValue("");
              onValueChange?.("");
              onChangeValue?.();
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {isOpen
        ? createPortal(
            <div
              id={`${id}-calendar`}
              ref={popoverRef}
              className="date-picker-popover"
              data-align="start"
              data-side="bottom"
              role="dialog"
              aria-label="Pilih tanggal"
            >
              <div className="date-picker-calendar-header">
                <button
                  type="button"
                  className="date-picker-month-button"
                  onClick={() => moveMonth(-1)}
                  disabled={Boolean(
                    min &&
                    toISODate(
                      new Date(
                        visibleMonth.getFullYear(),
                        visibleMonth.getMonth(),
                        0,
                      ),
                    ) < min,
                  )}
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft size={17} />
                </button>
                <p aria-live="polite">{MONTH_FORMAT.format(visibleMonth)}</p>
                <button
                  type="button"
                  className="date-picker-month-button"
                  onClick={() => moveMonth(1)}
                  disabled={Boolean(
                    max &&
                    toISODate(
                      new Date(
                        visibleMonth.getFullYear(),
                        visibleMonth.getMonth() + 1,
                        1,
                      ),
                    ) > max,
                  )}
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              <div
                className="date-picker-grid"
                role="group"
                aria-label={MONTH_FORMAT.format(visibleMonth)}
              >
                {WEEKDAYS.map((day) => (
                  <span key={day} className="date-picker-weekday">
                    {day}
                  </span>
                ))}
                {calendarDays.map(({ date, iso, inMonth }) => {
                  const isSelected = iso === value;
                  const today = iso === toISODate(new Date());
                  return (
                    <button
                      key={iso}
                      type="button"
                      aria-pressed={isSelected}
                      aria-current={today ? "date" : undefined}
                      aria-disabled={!isDateAllowed(iso)}
                      aria-label={DATE_FORMAT.format(
                        new Date(
                          Date.UTC(
                            date.getFullYear(),
                            date.getMonth(),
                            date.getDate(),
                          ),
                        ),
                      )}
                      tabIndex={iso === focusedISO ? 0 : -1}
                      ref={(element) => {
                        if (element) dayButtonRefs.current.set(iso, element);
                        else dayButtonRefs.current.delete(iso);
                      }}
                      className={`date-picker-day${inMonth ? "" : " is-outside"}${isSelected ? " is-selected" : ""}${today ? " is-today" : ""}`}
                      disabled={!isDateAllowed(iso)}
                      onFocus={() => setFocusedISO(iso)}
                      onKeyDown={(event) => moveFocusByKeyboard(event, iso)}
                      onClick={() => selectDate(iso)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="date-picker-footer">
                <button
                  type="button"
                  disabled={!isDateAllowed(todayISO)}
                  onClick={() => selectDate(toISODate(new Date()))}
                >
                  Hari ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    restoreTriggerFocusRef.current = true;
                    setOpen(false);
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
