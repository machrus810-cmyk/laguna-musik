'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'kampung_lagu_device_id';

/**
 * Returns or generates a unique, isolated user ID for this browser instance.
 */
export function getClientUserId(): string {
  if (typeof window === 'undefined') return '';

  let id = '';
  try {
    id = localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    // localStorage might fail in restricted iframe mode
  }

  // Fallback: check existing cookie if localStorage was empty
  if (!id) {
    const match = document.cookie.match(/(?:^|;\s*)device_id=([^;]+)/);
    if (match && match[1]) {
      const val = decodeURIComponent(match[1].trim());
      if (val) {
        id = val;
      }
    }
  }

  // If still empty (e.g. brand new browser), generate a unique UUID
  if (!id) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      id = `user-${crypto.randomUUID()}`;
    } else {
      id = `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }

  // Persist to both localStorage and cookie
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ignore
  }

  try {
    document.cookie = `device_id=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Ignore
  }

  return id;
}

// ClientUserInit ensures each browser instance has an isolated user ID stored
// in localStorage and document.cookie.
export default function ClientUserInit() {
  useEffect(() => {
    getClientUserId();
  }, []);

  return null;
}
