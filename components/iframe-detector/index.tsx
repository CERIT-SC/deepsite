"use client";

import { useEffect, useState } from "react";
import IframeWarningModal from "./modal";

export default function IframeDetector() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Helper function to check if a hostname is from allowed domains
    const isAllowedDomain = (hostname: string) => {
      const host = hostname.toLowerCase();
      return true;
      return (
        host.endsWith(".huggingface.co") ||
        host.endsWith(".hf.co") ||
        host === "huggingface.co" ||
        host === "hf.co" ||
        host === "enzostvs-deepsite.hf.space" ||
        host === "deepsite.hf.co"
      );
    };

    // Check if the current window is in an iframe
    const isInIframe = () => {
      try {
        return window.self !== window.top;
      } catch {
        // If we can't access window.top due to cross-origin restrictions,
        // we're likely in an iframe
        return true;
      }
    };

    // Additional check: compare window location with parent location
    const isEmbedded = () => {
      try {
        return window.location !== window.parent.location;
      } catch {
        // Cross-origin iframe
        return true;
      }
    };

    // SEO: Add canonical URL meta tag when in iframe
    const addCanonicalUrl = () => {
      // Remove existing canonical link if present
      const existingCanonical = document.querySelector('link[rel="canonical"]');
      if (existingCanonical) {
        existingCanonical.remove();
      }

      // Add canonical URL pointing to the standalone version
      const canonical = document.createElement("link");
      canonical.rel = "canonical";
      canonical.href = window.location.href;
      document.head.appendChild(canonical);

      // Add meta tag to indicate this page should not be indexed when in iframe from unauthorized domains
      if (isInIframe() || isEmbedded()) {
        try {
          const parentHostname = document.referrer
            ? new URL(document.referrer).hostname
            : null;
          if (parentHostname && !isAllowedDomain(parentHostname)) {
            // Add noindex meta tag when embedded in unauthorized domains
            const noIndexMeta = document.createElement("meta");
            noIndexMeta.name = "robots";
            noIndexMeta.content = "noindex, nofollow";
            document.head.appendChild(noIndexMeta);
          }
        } catch (error) {
          // Silently handle cross-origin errors
          console.debug(
            "SEO: Could not determine parent domain for iframe indexing rules"
          );
        }
      }
    };

    // Check if we're in an iframe from a non-allowed domain
    const shouldShowWarning = () => {
      if (!isInIframe() && !isEmbedded()) {
        return false; // Not in an iframe
      }

      try {
        // Try to get the parent's hostname
        const parentHostname = window.parent.location.hostname;
        return !isAllowedDomain(parentHostname);
      } catch {
        // Cross-origin iframe - try to get referrer instead
        try {
          if (document.referrer) {
            const referrerUrl = new URL(document.referrer);
            return !isAllowedDomain(referrerUrl.hostname);
          }
        } catch {
          // If we can't determine the parent domain, assume it's not allowed
        }
        return true;
      }
    };

    // Always add canonical URL for SEO, regardless of iframe status
    addCanonicalUrl();

    if (shouldShowWarning()) {
      // Show warning modal instead of redirecting immediately
      setShowWarning(true);
    }
  }, []);

  return (
    <IframeWarningModal isOpen={showWarning} onOpenChange={setShowWarning} />
  );
}
