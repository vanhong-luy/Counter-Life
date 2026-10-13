'use client';

import { useEffect, useRef, useState } from 'react';
import { getAdminToken } from '@/lib/api';

// ── Shared photo cache + in-flight dedupe (module-level, survives re-mounts) ──
// Keyed by customerId so a photo fetched on /admin/kyc is reused on /admin/users,
// and pagination/filter changes don't re-fetch already-loaded photos.
const photoCache = new Map();        // customerId -> blobUrl ('' = known "no photo", never retried)
const inFlight = new Set();          // customerId -> currently fetching
const pending = new Map();           // customerId -> array of resolvers

// ── Concurrency limiter: at most MAX_CONCURRENT photo fetches at once ──
// A 50-row page firing 50 fetches at once bursts the Next.js proxy and the
// backend drops some connections (ERR_CONNECTION_RESET / TIMED_OUT). Queueing
// keeps it to a small steady stream.
const MAX_CONCURRENT = 6;
let activeFetches = 0;
const queue = [];

const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1000];

function nextFromQueue() {
  while (queue.length > 0 && activeFetches < MAX_CONCURRENT) {
    const run = queue.shift();
    activeFetches++;
    run().finally(() => { activeFetches--; nextFromQueue(); });
  }
}

async function fetchPhoto(customerId, attempt = 0) {
  try {
    const token = getAdminToken();
    const res = await fetch(`/auth/profile-photo/${customerId}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) {
      // Definitive "no photo" — cache as empty, never retry.
      photoCache.set(customerId, '');
      return '';
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const blob = await res.blob();
    if (blob.size === 0) {
      photoCache.set(customerId, '');
      return '';
    }
    const url = URL.createObjectURL(blob);
    photoCache.set(customerId, url);
    return url;
  } catch (err) {
    // Network/5xx errors: retry with backoff, but only up to MAX_RETRIES.
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt] || 1000;
      await new Promise(r => setTimeout(r, delay));
      return fetchPhoto(customerId, attempt + 1);
    }
    photoCache.set(customerId, '');
    return '';
  }
}

function loadPhoto(customerId) {
  // Already cached (either a blobUrl or '' for no-photo).
  if (photoCache.has(customerId)) {
    return Promise.resolve(photoCache.get(customerId));
  }
  // Already in flight — share the same promise so duplicate rows don't double-fetch.
  if (inFlight.has(customerId)) {
    return new Promise(resolve => {
      const list = pending.get(customerId) || [];
      list.push(resolve);
      pending.set(customerId, list);
    });
  }
  // Start a new fetch through the concurrency queue.
  inFlight.add(customerId);
  return new Promise(resolve => {
    const finish = (url) => {
      inFlight.delete(customerId);
      const waiters = pending.get(customerId) || [];
      pending.delete(customerId);
      for (const w of waiters) w(url);
      resolve(url);
    };
    queue.push(() => fetchPhoto(customerId).then(finish, () => finish('')));
    nextFromQueue();
  });
}

function initials(first, last) {
  const f = (first || '')[0] || '';
  const l = (last || '')[0] || '';
  return (f + l).toUpperCase() || '?';
}

export default function ProfileAvatar({ customerId, profilePhotoUrl, firstName, lastName, kycStatus }) {
  const [blobUrl, setBlobUrl] = useState(() =>
    photoCache.has(customerId) ? photoCache.get(customerId) || null : null
  );
  const ownedUrl = useRef(null); // URLs this instance created (safe to revoke)

  useEffect(() => {
    if (!profilePhotoUrl) return;
    let cancelled = false;

    loadPhoto(customerId).then(url => {
      if (cancelled) return;
      if (url) {
        // Only treat as "owned" if this instance is the one that just created it,
        // i.e. it wasn't already cached for other rows. We can't easily know, so
        // we avoid revoking shared/cached URLs entirely (small, acceptable leak
        // given they're reused across rows and pages).
        ownedUrl.current = url;
        setBlobUrl(url);
      }
    });

    return () => { cancelled = true; };
  }, [customerId, profilePhotoUrl]);

  if (blobUrl) {
    return (
      <div className="customerAvatar" style={{ overflow: 'hidden' }}>
        <img src={blobUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  return <div className="customerAvatar">{initials(firstName, lastName)}</div>;
}
