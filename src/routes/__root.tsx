import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "MARKET AI — Gerador de Anúncios & Catálogo PRO (Mercado Livre & Bling)" },
      { name: "description", content: "MARKET AI: Crie anúncios de alta conversão para Mercado Livre e Bling com fotos 1:1 em fundo branco, quebra de objeções, SKUs padronizados e classificação fiscal NCM/EAN-13." },
      { name: "author", content: "MARKET AI" },
      { name: "theme-color", content: "#152238" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "MARKET AI" },
      { name: "application-name", content: "MARKET AI" },
      { property: "og:title", content: "MARKET AI — Gerador Inteligente de Anúncios para Marketplace" },
      { property: "og:description", content: "Fotos 1:1 com fundo branco, arte de quebra de objeções, SKUs padronizados e EAN-13 para marketplace." },
      { property: "og:image", content: "/logo-market-ai.jpg" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/logo-market-ai.jpg" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],


  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased selection:bg-primary/20">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Remove e oculta permanentemente o badge "Edit with Lovable" do DOM
  useEffect(() => {
    const removeLovableBadge = () => {
      const selectors = [
        "#lovable-badge",
        "[data-lovable-badge]",
        ".lovable-badge",
        "a[href*='lovable.dev']",
        "div[id*='lovable']",
        "#lovable-editor-badge",
        "[data-component-name='LovableBadge']",
      ];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          (el as HTMLElement).style.setProperty("display", "none", "important");
          (el as HTMLElement).style.setProperty("opacity", "0", "important");
          (el as HTMLElement).style.setProperty("visibility", "hidden", "important");
          (el as HTMLElement).style.setProperty("pointer-events", "none", "important");
          el.remove();
        });
      });

      // Varre links ou botões que contenham "Edit with Lovable" ou "Lovable"
      document.querySelectorAll("a, button, div").forEach((node) => {
        const text = node.textContent || "";
        if (
          text.includes("Edit with Lovable") ||
          text.includes("Made with Lovable") ||
          text.includes("lovable.dev")
        ) {
          if (!node.closest("#settings-dialog") && !node.closest(".settings-content")) {
            (node as HTMLElement).style.setProperty("display", "none", "important");
            node.remove();
          }
        }
      });
    };

    removeLovableBadge();
    const observer = new MutationObserver(() => {
      removeLovableBadge();
    });

    // Registra o Service Worker do PWA para permitir instalação nativa
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registrado com sucesso:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Erro ao registrar Service Worker:", err);
        });
    }

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
