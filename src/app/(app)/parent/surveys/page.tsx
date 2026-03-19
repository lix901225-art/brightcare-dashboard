"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardList, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type Question = {
  id: string;
  text: string;
  type: "rating" | "text" | "choice";
  options?: string[];
};

type AvailableSurvey = {
  id: string;
  title: string;
  description?: string | null;
  questions: Question[];
  createdAt: string;
  hasResponded: boolean;
};

export default function ParentSurveysPage() {
  const [surveys, setSurveys] = useState<AvailableSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState<AvailableSurvey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [overallRating, setOverallRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    apiFetch("/surveys/available")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSurveys(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openSurvey(survey: AvailableSurvey) {
    setActiveSurvey(survey);
    setAnswers({});
    setOverallRating(0);
    setFeedback("");
    setError("");
  }

  async function submit() {
    if (!activeSurvey) return;
    try {
      setSubmitting(true);
      setError("");
      const answerArray = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
      const res = await apiFetch("/surveys/respond", {
        method: "POST",
        body: JSON.stringify({
          templateId: activeSurvey.id,
          answers: answerArray,
          rating: overallRating || undefined,
          feedback: feedback.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to submit.");
      }
      setOk("Thank you for your feedback!");
      setSurveys((prev) => prev.map((s) => (s.id === activeSurvey.id ? { ...s, hasResponded: true } : s)));
      setActiveSurvey(null);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to submit survey."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-6 text-center text-sm text-slate-400">Loading surveys...</div>;

  return (
    <div className="mx-auto max-w-2xl p-4 lg:p-6">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Surveys</h1>
      <p className="mb-6 text-sm text-slate-500">Help us improve — share your feedback.</p>

      {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {/* Active survey form */}
      {activeSurvey && (
        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>{activeSurvey.title}</CardTitle>
            {activeSurvey.description && <p className="text-sm text-slate-500">{activeSurvey.description}</p>}
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {(activeSurvey.questions as Question[]).map((q, i) => (
                <div key={q.id}>
                  <div className="mb-2 text-sm font-medium text-slate-700">{i + 1}. {q.text}</div>
                  {q.type === "rating" ? (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition ${Number(answers[q.id] || 0) >= n ? "border-amber-300 bg-amber-50 text-amber-600" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  ) : q.type === "choice" && q.options ? (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                          className={`rounded-lg border px-3 py-2 text-sm ${answers[q.id] === opt ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={(answers[q.id] as string) || ""}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      rows={2}
                      placeholder="Your answer..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                    />
                  )}
                </div>
              ))}

              {/* Overall rating */}
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">Overall satisfaction</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setOverallRating(n)}>
                      <Star className={`h-7 w-7 ${n <= overallRating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional feedback */}
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">Additional comments (optional)</div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Anything else you'd like to share..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit feedback"}
                </button>
                <button onClick={() => setActiveSurvey(null)} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Survey list */}
      {surveys.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="py-8 text-center">
            <ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <div className="text-sm text-slate-500">No surveys available right now.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {surveys.map((s) => (
            <Card key={s.id} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{s.title}</div>
                    {s.description && <div className="mt-0.5 text-sm text-slate-500">{s.description}</div>}
                    <div className="mt-1 text-xs text-slate-400">{(s.questions as Question[]).length} questions</div>
                  </div>
                  {s.hasResponded ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                      <Check className="h-3 w-3" /> Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => openSurvey(s)}
                      className="inline-flex h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Take survey
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
