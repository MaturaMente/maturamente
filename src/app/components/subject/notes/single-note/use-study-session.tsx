"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseStudySessionProps {
  noteId: string;
  enabled?: boolean;
}

interface StudySession {
  sessionId: string;
  startedAt: string;
}

export function useStudySession({
  noteId,
  enabled = true,
}: UseStudySessionProps) {
  const [session, setSession] = useState<StudySession | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUserActiveRef = useRef<boolean>(true);
  const isMountedRef = useRef<boolean>(true);
  const isCreatingSessionRef = useRef<boolean>(false);

  // Track user activity
  useEffect(() => {
    if (!enabled) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      isUserActiveRef.current = true;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isUserActiveRef.current = false;
      } else {
        updateActivity();
      }
    };

    // Track various user activities
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => {
      document.addEventListener(event, updateActivity, true);
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, updateActivity, true);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);

  // Create session function
  const createSession = useCallback(async () => {
    if (
      !enabled ||
      sessionIdRef.current ||
      !isMountedRef.current ||
      isCreatingSessionRef.current
    ) {
      return;
    }

    isCreatingSessionRef.current = true;

    try {
      const response = await fetch("/api/notes/study-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ noteId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (isMountedRef.current) {
          setSession(data);
          sessionIdRef.current = data.sessionId;
          setIsTracking(true);
        }
      } else {
        console.error("Failed to create study session:", response.status);
      }
    } catch (error) {
      console.error("Failed to create study session:", error);
    } finally {
      isCreatingSessionRef.current = false;
    }
  }, [noteId, enabled]);

  // End session function
  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    const sessionId = sessionIdRef.current;

    try {
      await fetch(`/api/notes/study-session/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "end" }),
      });
    } catch (error) {
      console.error("Failed to end study session:", error);
    } finally {
      sessionIdRef.current = null;
      setSession(null);
      setIsTracking(false);
    }
  }, []);

  // Send ping function
  const sendPing = useCallback(async () => {
    if (!sessionIdRef.current || !isUserActiveRef.current) return;

    try {
      await fetch(`/api/notes/study-session/${sessionIdRef.current}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "ping" }),
      });
    } catch (error) {
      console.error("Failed to send ping:", error);
    }
  }, []);

  // Auto-start session when component mounts
  useEffect(() => {
    if (!enabled) return;

    isMountedRef.current = true;
    createSession();

    return () => {
      isMountedRef.current = false;
      if (sessionIdRef.current) {
        // End session when component unmounts
        endSession();
      }
    };
  }, [enabled, noteId, createSession, endSession]);

  // Set up ping interval
  useEffect(() => {
    if (!enabled || !isTracking) return;

    pingIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      // Only ping if user was active in the last 60 seconds
      if (timeSinceLastActivity < 60000) {
        sendPing();
      }
    }, 30000); // Ping every 30 seconds

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [isTracking, enabled, sendPing]);

  // Handle page unload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        console.log(
          "DEBUG: Page unload - ending session:",
          sessionIdRef.current
        );
        // Use sendBeacon for reliable delivery during page unload
        const formData = new FormData();
        formData.append("action", "end");

        navigator.sendBeacon(
          `/api/notes/study-session/${sessionIdRef.current}`,
          formData
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);

  return {
    session,
    isTracking,
    endSession: useCallback(() => {
      if (sessionIdRef.current) {
        endSession();
      }
    }, [endSession]),
  };
}
