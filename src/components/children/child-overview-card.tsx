import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChildOverviewCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">{value}</div>
        {hint ? <div className="mt-1 text-sm text-slate-500">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
