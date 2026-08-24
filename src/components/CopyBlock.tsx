import { useState } from "react";
import { motion } from "framer-motion";
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
  rows = 12,
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
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-xl transition-all hover:border-primary/30">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            {label}
          </h3>
          {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onRegenerate ? (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={regenerating}
                className="h-8 gap-1.5 rounded-xl px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`size-3.5 ${regenerating ? "animate-spin text-primary" : ""}`} />
                <span>Regenerar</span>
              </Button>
            </motion.div>
          ) : null}
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              variant={copied ? "default" : "secondary"}
              onClick={copy}
              className={`h-8 gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all ${
                copied
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </motion.div>
        </div>
      </header>
      {multiline ? (
        <Textarea
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className="resize-y rounded-xl bg-muted/30 font-normal leading-relaxed text-foreground shadow-inner focus:bg-background"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 rounded-xl bg-muted/30 font-medium text-foreground shadow-inner focus:bg-background"
        />
      )}
    </div>
  );
}
