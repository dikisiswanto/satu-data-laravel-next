import Link from "next/link";
import { ArrowUpRight, Building2, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
export function DatasetCard({ dataset }) {
  return (
    <Card className="flex h-full flex-col transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="primary">{dataset.category || "Dataset"}</Badge>
          <ArrowUpRight
            aria-hidden="true"
            className="shrink-0 text-muted"
            size={17}
          />
        </div>
        <h2 className="mt-4 text-lg font-semibold leading-snug">
          <Link
            className="rounded-sm hover:text-primary focus-visible:outline-none"
            href={`/dataset/${dataset.slug}`}
          >
            {dataset.title}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
          {dataset.description}
        </p>
      </CardHeader>
      <CardContent className="mt-auto space-y-3 text-xs text-muted">
        <p className="flex items-center gap-2">
          <Building2 size={14} aria-hidden="true" />
          <span>
            {dataset.organizations?.name || "Organisasi belum dicantumkan"}
          </span>
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays size={14} aria-hidden="true" />
          <span>Terbit {formatDate(dataset.published_at)}</span>
        </p>
      </CardContent>
    </Card>
  );
}
