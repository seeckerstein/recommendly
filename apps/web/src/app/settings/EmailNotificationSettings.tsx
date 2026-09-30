"use client";

import { useEffect, useState } from "react";
import { getEmailNotificationSettings, updateEmailNotificationSettings } from "@/lib/api";

export function EmailNotificationSettings() {
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getEmailNotificationSettings()
      .then((value) => {
        if (active) setEnabled(value);
      })
      .catch(() => {
        // Keep the default enabled state if settings cannot be loaded.
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleChange() {
    if (!loaded || saving) return;
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      await updateEmailNotificationSettings(next);
    } catch {
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="py-6">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h2 className="display text-[1.125rem] leading-snug text-ink">Email notifications</h2>
          <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
            Get an email when someone asks to connect with you.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Email me about new contact requests"
          disabled={!loaded || saving}
          onClick={handleChange}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${enabled ? "bg-ink" : "bg-line-strong"}`}
        >
          <span
            className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
      </div>
    </section>
  );
}
