// ChatBot.jsx
// Floating "Ask the price list" chat. Answers come from the backend (/api/chat),
// which uses Claude with the full price list as its only source.
import { useEffect, useRef, useState } from "react";
import { speechErrorMessage, useSpeech } from "./useSpeech";

const EXAMPLES = ["MRF 2.75-18 rib price", "Cheapest 90/100-10 tyre", "Exide 4 wheeler batteries 65Ah"];

export default function ChatBot({ apiUrl }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant", content }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Keep the newest message in view
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = async (text) => {
    const question = text.trim();
    if (!question || busy) return;
    const history = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError("");
    setBusy(true);

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }
      // Show the answer as it arrives
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: answer }]);
      }
      if (!answer.trim()) throw new Error("No answer received. Please try again.");
    } catch (err) {
      setMessages(history); // drop the empty answer bubble
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const voice = useSpeech({
    onResult: (alternatives, isFinal) => {
      const heard = alternatives[0] || "";
      setInput(heard);
      if (isFinal && heard) send(heard);
    },
    onError: (code) => setError(speechErrorMessage(code)),
  });

  return (
    <>
      {/* 💬 Open button */}
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="fixed right-4 bottom-20 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-blue-600 text-white shadow-2xl hover:bg-blue-700 font-bold text-sm"
          aria-label="Open price list chat"
        >
          <span className="text-lg">💬</span>
          <span>Ask</span>
        </button>
      )}

      {/* 💬 Chat panel */}
      {open && (
        <div className="fixed z-50 inset-x-0 bottom-0 h-[80vh] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[26rem] sm:h-[34rem] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between flex-shrink-0">
            <div>
              <div className="font-bold text-sm">💬 Ask the price list</div>
              <div className="text-[11px] text-gray-400">Answers come only from your uploaded price lists</div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    setMessages([]);
                    setError("");
                  }}
                  disabled={busy}
                  className="px-2 py-1 text-xs text-gray-300 hover:text-white rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 text-lg font-bold"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-grow overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-xs text-gray-500 pt-6 space-y-3">
                <p>Ask about any product, size, or price. Type or tap 🎤 and speak (English, Marathi, Hindi).</p>
                <div className="flex flex-col items-center gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => send(ex)}
                      className="px-3 py-1.5 rounded-full bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                  }`}
                >
                  {m.content || <span className="text-gray-400 animate-pulse">Looking it up…</span>}
                </div>
              </div>
            ))}
            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-2 border-t border-gray-200 flex items-center gap-2 flex-shrink-0 bg-white"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voice.listening ? "Listening…" : "e.g. mrf 2.75-18 rib price"}
              className={`flex-grow min-w-0 p-2.5 border rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                voice.listening ? "border-red-400" : "border-gray-300"
              }`}
              maxLength={1000}
              aria-label="Ask a question"
            />
            <button
              type="button"
              onClick={voice.start}
              className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg border ${
                voice.listening ? "bg-red-600 text-white border-red-600 animate-pulse" : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
              aria-label="Ask by voice"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="px-4 h-10 flex-shrink-0 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:bg-gray-300"
            >
              {busy ? "…" : "Send"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
