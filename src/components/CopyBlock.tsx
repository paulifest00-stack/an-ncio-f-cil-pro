import { useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface CopyBlockProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

export function CopyBlock({
  label,
  value,
  onChange,
  multiline,
  rows = 14,
  hint,
  onRegenerate,
  regenerating,
}: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onRegenerate ? (
            <Button variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating}>
              <RefreshCw className={regenerating ? "animate-spin" : ""} />
              Regenerar
            </Button>
          ) : null}
          <Button size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </header>
      {multiline ? (
        <Textarea
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className="resize-y font-normal"
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </section>
  );
}
