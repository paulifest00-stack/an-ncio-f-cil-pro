import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const STEPS = [
  "Analisando produto...",
  "Pesquisando informações...",
  "Identificando características...",
  "Gerando anúncio...",
  "Preparando conteúdo...",
];

export function Processing({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (error) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4200);
    return () => clearInterval(id);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      {error ? (
        <div className="text-center">
          <h2 className="text-lg font-semibold">Não foi possível gerar</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          {onRetry ? (
            <button
              onClick={onRetry}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-4">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              {i < step ? (
                <Check className="size-4 text-primary" />
              ) : i === step ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <span className="size-4 rounded-full border border-border" />
              )}
              <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
