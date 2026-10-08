"use client";

import { useEffect, useState } from "react";
import {
  getEmailNotificationSettings,
  updateEmailNotificationSettings,
  type EmailNotificationSettingsValue,
} from "@/lib/api";

export function EmailNotificationSettings() {
  const [settings, setSettings] = useState<EmailNotificationSettingsValue>({
    email_contact_requests: true,
    email_weekly_recommendations: true,
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getEmailNotificationSettings()
      .then((value) => {
        if (active) setSettings(value);
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

  async function handleChange(key: keyof EmailNotificationSettingsValue) {
    if (!loaded || saving) return;
    const next = !settings[key];
    setSettings((current) => ({ ...current, [key]: next }));
    setSaving(true);
    try {
      await updateEmailNotificationSettings({ [key]: next });
    } catch {
      setSettings((current) => ({ ...current, [key]: !next }));
    } finally {
      setSaving(false);
    }
  }

  const rows: {
    key: keyof EmailNotificationSettingsValue;
    title: string;
    description: string;
    label: string;
  }[] = [
    {
      key: "email_contact_requests",
      title: "Email notifications",
      description: "Get an email when someone asks to connect with you.",
      label: "Email me about new contact requests",
    },
    {
      key: "email_weekly_recommendations",
      title: "Weekly recommendations email",
      description:
        "Get a Friday email with recommendations you can currently access, grouped by category.",
      label: "Weekly recommendations email",
    },
  ];

  return (
    <>
      {rows.map(({ key, title, description, label }) => (
        <section key={key} className="py-6">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h2 className="display text-[1.125rem] leading-snug text-ink">
                {title}
              </h2>
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
                {description}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings[key]}
              aria-label={label}
              disabled={!loaded || saving}
              onClick={() => handleChange(key)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${settings[key] ? "bg-ink" : "bg-line-strong"}`}
            >
              <span
                className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${settings[key] ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>
        </section>
      ))}
    </>
  );
}
