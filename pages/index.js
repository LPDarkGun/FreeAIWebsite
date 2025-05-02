import { useState, useRef, useEffect } from "react"

export default function SimplifiedChat() {
  const [messages, setMessages] = useState([
    {
      role: "system",
      content: "You are a helpful assistant.",
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  const systemMessage = {
    role: "system",
    content: "You are a helpful assistant.",
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Single theme UI styling
  const styles = {
    container: "from-slate-950 via-blue-950 to-slate-950",
    userMsg: "from-emerald-600/90 to-teal-700/90 border-emerald-400/50",
    assistantMsg: "from-gray-800/90 to-slate-900/90 border-violet-500/40",
    input: "bg-slate-900/80 border-emerald-700/50 focus:border-emerald-400/70",
    button:
      "from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600",
    accent: "emerald-400",
    codeBlock: "bg-slate-900/90 border-emerald-700/30",
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    }
    const chatHistory = [systemMessage, ...messages.slice(1), userMessage]
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)
    setIsTyping(true)

    try {
      const res = await fetch(
        "https://api.intelligence.io.solutions/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6IjA2ZmE5OWEzLWE3MjItNGIxZS1iZTEwLWUxZTU3MjU2OGUzZiIsImV4cCI6NDg5OTMyNzIwMX0.fpiCGl4C32GZ4prMHwWJtchy0hW25SNfpxkyS-CJSADsXDe_pSZZMBIdZ4s-aXM4srSWbCdoJj3hGggY2Mi-_w",
          },
          body: JSON.stringify({
            model: "meta-llama/Llama-3.3-70B-Instruct",
            messages: chatHistory,
            temperature: 0.7,
            max_tokens: 500,
            system: {
              content: "YOU MUST Keep responses under 500 tokens.",
            },
          }),
        }
      )

      const raw = await res.text()
      let data
      try {
        data = JSON.parse(raw)
      } catch {
        throw new Error("Server returned non-JSON response:\n" + raw)
      }

      const reply = data.choices?.[0]?.message
      if (reply) {
        setTimeout(() => {
          setIsTyping(false)
          setMessages((prev) => [
            ...prev,
            {
              role: reply.role,
              content: reply.content,
              timestamp: new Date().toISOString(),
            },
          ])
        }, 1000)
      }
    } catch (err) {
      console.error("Fetch error:", err)
      setIsTyping(false)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting to the server. Please try again later.",
          error: true,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const escapeHTML = (str) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  const highlightSyntax = (code, language) => {
    const escaped = escapeHTML(code)
    return escaped
      .replace(
        /(\/\/.*|\/\*[\s\S]*?\*\/|#.*)/g,
        '<span class="text-gray-400">$1</span>'
      )
      .replace(
        /\b(function|const|let|var|if|else|for|while|return|import|export|class|extends|async|await|try|catch|new|this)\b/g,
        '<span class="text-purple-400">$1</span>'
      )
      .replace(
        /(".*?"|'.*?'|`[\s\S]*?`)/g,
        '<span class="text-yellow-300">$1</span>'
      )
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-blue-300">$1</span>')
      .replace(/(\w+)(\s*\()/g, '<span class="text-cyan-400">$1</span>$2')
      .replace(/(\.\w+)\b/g, '<span class="text-pink-300">$1</span>')
      .replace(
        /\b(true|false|null|undefined)\b/g,
        '<span class="text-orange-300">$1</span>'
      )
      .replace(
        /(&lt;\/?\w+)(.*?)(&gt;)/g,
        '<span class="text-red-400">$1</span>$2<span class="text-red-400">$3</span>'
      )
  }

  const formatMessageContent = (content) => {
    const codeBlocks = []
    content = content.replace(
      /```(\w+)?\s*([\s\S]*?)```/g,
      (match, lang, code) => {
        const index = codeBlocks.length
        codeBlocks.push({ lang: lang || "text", code })
        return `[[CODEBLOCK_${index}]]`
      }
    )

    // Step 2: escape and format the rest (non-code)
    let formatted = escapeHTML(content)
      .replace(
        /\*\*(.*?)\*\*/g,
        `<span class="font-bold text-emerald-400">$1</span>`
      )
      .replace(
        /`([^`]+)`/g,
        `<code class="bg-slate-800/90 px-1.5 py-0.5 rounded text-emerald-400 font-mono border-l-2 border-emerald-500/50">$1</code>`
      )
      .replace(/#{1,6}\s+(.*?)$/gm, (m, txt) => {
        const lvl = m.match(/^#+/)[0].length
        const sizes = [
          "text-2xl",
          "text-xl",
          "text-lg",
          "text-base",
          "text-sm",
          "text-xs",
        ]
        return `<h${lvl} class="font-bold ${
          sizes[lvl - 1]
        } text-emerald-400 my-3 border-b border-emerald-800/50 pb-1">${txt}</h${lvl}>`
      })
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        `<a href="$2" target="_blank" class="text-emerald-400 underline hover:text-emerald-300">$1</a>`
      )
      .replace(
        /^\s*[-*]\s+(.+)$/gm,
        `<div class="flex items-start my-1.5"><span class="text-emerald-400 mr-2 mt-1">•</span><span>$1</span></div>`
      )
      .replace(
        /^\s*>\s+(.+)$/gm,
        `<div class="border-l-2 border-violet-500/50 pl-3 my-2 text-gray-300 italic">$1</div>`
      )

    // Step 3: replace placeholders with rendered code blocks
    formatted = formatted.replace(/\[\[CODEBLOCK_(\d+)\]\]/g, (_, idx) => {
      const { lang, code } = codeBlocks[idx]
      const langClass =
        {
          javascript: "text-yellow-300",
          python: "text-blue-300",
          html: "text-orange-300",
          css: "text-pink-300",
        }[lang.toLowerCase()] || "text-green-400"
      const id = `code-${idx}`

      return `
  <div class="relative group bg-slate-900/90 border border-emerald-700/30 my-3 rounded-xl shadow-lg">
    <div class="flex justify-between items-center px-4 py-2 bg-slate-800/90 text-emerald-400 rounded-t-xl border-b border-gray-700/50">
      <span class="text-xs font-mono tracking-wide">${lang}</span>
      <button onclick="document.getElementById('${id}').select();document.execCommand('copy')" class="text-xs hover:text-white">Copy</button>
    </div>
    <pre class="p-4 overflow-x-auto"><code class="${langClass} font-mono text-sm">${highlightSyntax(
        code,
        lang
      )}</code></pre>
    <textarea id="${id}" class="absolute opacity-0 pointer-events-none" readonly>${code}</textarea>
  </div>`
    })

    return formatted
  }

  const formatRelativeTime = (timestamp) => {
    const now = new Date()
    const msgTime = new Date(timestamp)
    const diffM = Math.floor((now - msgTime) / 60000)
    if (diffM < 1) return "just now"
    if (diffM < 60) return `${diffM}m ago`
    const diffH = Math.floor(diffM / 60)
    if (diffH < 24) return `${diffH}h ago`
    return msgTime.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${styles.container} text-white p-4 md:p-6 flex flex-col`}
    >
      {/* Simplified background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-500/15 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-teal-500/20 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="fixed inset-0 bg-gradient-radial from-transparent to-black/30 z-0 pointer-events-none"></div>

      {/* Header */}
      <header className="mb-6 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-600 font-display tracking-tight">
              IO Intelligence
            </h1>
            <div className="flex items-center mt-2">
              <div className="h-1 w-24 bg-gradient-to-r from-emerald-400 to-teal-600 rounded-full"></div>
              <div className="ml-2 text-xs text-gray-400 flex items-center">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse"></span>
                <span className="tracking-wider font-medium">ONLINE</span>
              </div>
            </div>
          </div>
          <div className="backdrop-blur-md bg-slate-900/40 border-slate-700/40 text-xs px-3 py-1.5 rounded-full border shadow-lg">
            <div className="flex items-center space-x-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="font-medium text-gray-300">Llama 3.3 70B</span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-6 mb-6 p-2 custom-scrollbar relative z-10"
      >
        {messages.slice(1).map((msg, i) => (
          <div
            key={i}
            className={`${
              msg.role === "user" ? "ml-auto" : "mr-auto"
            } max-w-[85%] md:max-w-[70%] animate-fade-in`}
          >
            <div
              className={`rounded-xl shadow-lg border ${
                msg.role === "user"
                  ? `bg-gradient-to-r ${styles.userMsg} backdrop-blur-sm`
                  : `bg-gradient-to-r ${styles.assistantMsg} backdrop-blur-sm`
              } overflow-hidden ${msg.error ? "border-red-500/50" : ""}`}
            >
              <div className="px-4 py-2 border-b border-gray-700/30 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    {msg.role === "user" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 text-gray-300"
                      >
                        <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 text-emerald-400"
                      >
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path
                          fillRule="evenodd"
                          d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      msg.role === "user" ? "text-gray-300" : "text-emerald-400"
                    }`}
                  >
                    {msg.role === "user" ? "You" : "Assistant"}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {formatRelativeTime(msg.timestamp)}
                </span>
              </div>
              <div className="p-4">
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: formatMessageContent(msg.content),
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-3 text-gray-300 backdrop-blur-md bg-slate-900/40 border-slate-700/40 p-4 rounded-lg w-fit border animate-fade-in">
            <div className="flex space-x-1">
              {[0, 150, 300].map((delay) => (
                <div
                  key={delay}
                  className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
            <span className="text-sm font-light tracking-wider">
              Processing
            </span>
          </div>
        )}

        {isTyping && !loading && (
          <div className="flex items-center space-x-2 text-gray-300 backdrop-blur-md bg-slate-900/40 border-slate-700/40 p-3 rounded-lg w-fit border animate-fade-in mr-auto max-w-[85%] md:max-w-[70%]">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-emerald-400"
              >
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                <path
                  fillRule="evenodd"
                  d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex space-x-1 items-center h-6">
              {[0, 200, 400].map((delay) => (
                <div
                  key={delay}
                  className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-typing"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="relative z-10 backdrop-blur-md bg-slate-900/40 border-slate-700/40 p-3 rounded-xl border shadow-lg">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Send a message…"
            className={`w-full p-3 pr-16 rounded-lg ${styles.input} text-white outline-none border transition-all resize-none h-14`}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={`absolute right-5 bottom-5 p-2 rounded-lg ${
              loading || !input.trim()
                ? "bg-gray-600 cursor-not-allowed"
                : `bg-gradient-to-r ${styles.button}`
            } transition-all flex items-center justify-center w-10 h-10`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap");
        * {
          font-family: "Space Grotesk", system-ui, sans-serif;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        .animate-blob {
          animation: blob 25s infinite alternate;
        }
        .animation-delay-2000 {
          animation-delay: 5s;
        }
        .animation-delay-4000 {
          animation-delay: 10s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blob {
          0% {
            transform: scale(1) translate(0, 0);
          }
          33% {
            transform: scale(1.1) translate(40px, -50px);
          }
          66% {
            transform: scale(0.9) translate(-40px, 50px);
          }
          100% {
            transform: scale(1) translate(0, 0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 30, 40, 0.2);
          backdrop-filter: blur(5px);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 10px;
          backdrop-filter: blur(5px);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  )
}
