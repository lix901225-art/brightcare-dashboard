"use client";

import { useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [centreName, setCentreName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Build mailto link with form data
    const subject = encodeURIComponent(`Demo Request — ${centreName || name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nCentre: ${centreName}\n\n${message}`
    );
    window.location.href = `mailto:hello@brightcareos.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="text-2xl">✉️</div>
        <div className="mt-2 text-lg font-semibold text-slate-900">Message ready!</div>
        <div className="mt-1 text-sm text-slate-500">
          Your email client should open with the message. If not,{" "}
          <a href="mailto:hello@brightcareos.com" className="text-emerald-700 underline">
            email us directly
          </a>.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Send us a message</h2>
      <p className="mt-1 text-sm text-slate-500">
        Fill out the form and we&apos;ll get back to you within 24 hours.
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Your name <span className="text-rose-500">*</span>
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Email <span className="text-rose-500">*</span>
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Centre name
          </label>
          <input
            value={centreName}
            onChange={(e) => setCentreName(e.target.value)}
            placeholder="Sunshine Daycare"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your centre and what you're looking for..."
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <button
          type="submit"
          className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Send message
        </button>
      </div>
    </form>
  );
}
