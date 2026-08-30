"use client";

import { useEffect, useState } from "react";
import { getNotifications } from "./api";

export function useUnreadNotifications(): number {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    getNotifications()
      .then((items) => {
        if (active) setUnreadCount(items.filter((n) => !n.read_at).length);
      })
      .catch(() => {
        if (active) setUnreadCount(0);
      });
    return () => {
      active = false;
    };
  }, []);

  return unreadCount;
}
