export default function MessageBubble({
  sender,
  role,
  body,
  timestamp,
}: {
  sender: string;
  role: "STAFF" | "PARENT" | "OWNER";
  body: string;
  timestamp: string;
}) {
  const isInternal = role === "STAFF" || role === "OWNER";

  return (
    <div className={`flex ${isInternal ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
          isInternal ? "bg-slate-900 text-white" : "bg-white text-slate-800 border border-slate-200",
        ].join(" ")}
      >
        <div className={`mb-1 text-xs ${isInternal ? "text-slate-300" : "text-slate-500"}`}>
          {sender} · {timestamp}
        </div>
        <div>{body}</div>
      </div>
    </div>
  );
}
