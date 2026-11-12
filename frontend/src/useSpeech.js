// useSpeech.js
// Microphone → text using the browser's built-in speech recognition
// (Safari on iPhone/iPad/Mac, Chrome, Edge). Nothing is sent to our server.
import { useEffect, useRef, useState } from "react";

const Recognition =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const speechSupported = Boolean(Recognition);

// onResult(alternatives: string[], isFinal: boolean) is called while speaking and once at the end.
export function useSpeech({ onResult, onError, lang = "en-IN" }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const timerRef = useRef(null);
  const handlers = useRef({ onResult, onError });
  handlers.current = { onResult, onError };

  const stop = () => {
    clearTimeout(timerRef.current);
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
  };

  // Must be called straight from a tap/click, or iOS Safari blocks the mic.
  const start = () => {
    if (!Recognition) {
      handlers.current.onError?.("unsupported");
      return;
    }
    if (recRef.current) {
      stop();
      return;
    }
    // iOS Safari needs a fresh recognizer for every session.
    const rec = new Recognition();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 3;

    rec.onresult = (event) => {
      let isFinal = false;
      const alternatives = [];
      // Join every phrase heard so far; collect alternatives of the last one.
      const prefix = [];
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (i < event.results.length - 1) prefix.push(res[0].transcript);
        else {
          isFinal = res.isFinal;
          for (let a = 0; a < res.length; a++) alternatives.push([...prefix, res[a].transcript].join(" ").trim());
        }
      }
      handlers.current.onResult?.(alternatives.filter(Boolean), isFinal);
      if (isFinal) stop();
    };
    rec.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") handlers.current.onError?.(event.error);
    };
    rec.onend = () => {
      clearTimeout(timerRef.current);
      recRef.current = null;
      setListening(false);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      // Safety stop in case the browser never ends the session.
      timerRef.current = setTimeout(stop, 10000);
    } catch (err) {
      recRef.current = null;
      handlers.current.onError?.(err?.name || "start-failed");
    }
  };

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
  }, []);

  return { listening, start, stop };
}

export function speechErrorMessage(code) {
  if (code === "unsupported")
    return "Voice search isn't supported in this browser. Use Safari or Chrome, or the mic on your keyboard.";
  if (code === "not-allowed" || code === "service-not-allowed")
    return "Microphone blocked. Allow microphone (and Siri & Dictation on iPhone), then try again.";
  if (code === "network") return "Voice search needs an internet connection.";
  return "Couldn't hear that, tap the mic and try again.";
}
