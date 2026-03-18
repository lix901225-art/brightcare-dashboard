"use client";

import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

const SURVEY_REMINDER_KEY = "brightcare.survey-reminder-dismissed";
const REMINDER_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function SurveyReminder() {
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Check if reminder should show
    const dismissed = localStorage.getItem(SURVEY_REMINDER_KEY);
    if (dismissed) {
      const dismissedAt = Number(dismissed);
      if (Date.now() - dismissedAt < REMINDER_INTERVAL_MS) return;
    }

    // Check if there's an available survey
    apiFetch("/surveys/available")
      .then((r) => (r.ok ? r.json() : []))
      .then((surveys: any[]) => {
        if (!Array.isArray(surveys)) return;
        const available = surveys.find((s) => !s.hasResponded);
        if (available) {
          setTemplateId(available.id);
          setShow(true);
        }
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    localStorage.setItem(SURVEY_REMINDER_KEY, String(Date.now()));
    setShow(false);
  }

  async function submit() {
    if (!rating) return;
    setSubmitting(true);
    try {
      await apiFetch("/surveys/respond", {
        method: "POST",
        body: JSON.stringify({
          templateId,
          answers: [],
          rating,
          feedback: feedback.trim() || undefined,
        }),
      });
      setDone(true);
      setTimeout(() => {
        localStorage.setItem(SURVEY_REMINDER_KEY, String(Date.now()));
        setShow(false);
      }, 2000);
    } catch {
      dismiss();
    } finally {
      setSubmitting(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {done ? (
          <div className="py-4 text-center">
            <div className="text-2xl">🙏</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">Thank you!</div>
            <div className="mt-1 text-sm text-slate-500">Your feedback helps us improve.</div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">How are we doing?</h3>
                <p className="mt-1 text-sm text-slate-500">Rate your experience with BrightCare</p>
              </div>
              <button onClick={dismiss} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star className={`h-10 w-10 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <div className="mt-4">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Any comments? (optional)"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none"
                />
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="mt-3 h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            )}

            <button onClick={dismiss} className="mt-3 w-full text-center text-xs text-slate-400 hover:text-slate-600">
              Maybe later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
