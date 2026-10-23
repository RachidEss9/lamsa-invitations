import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { StudioGate } from "@/components/StudioGate";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router";
import "./index.css";
import { ensureSorgena } from "./lib/sorgena";

// Register the licensed brand display face when the webfonts are present. Runs
// before the first paint's font resolution; absent files keep the fallbacks.
ensureSorgena();

// Load the application interface font (Montserrat) as self-hosted WOFF2 via Fontsource.
// This is the app glyph stack used by navigation, buttons, panels, labels, dialogs,
// and dashboard UI. Invitation design typography is configured independently in the
// invitation content / design document and is untouched by this import.
import "@fontsource-variable/montserrat";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Editor = lazy(() => import("./pages/Editor.tsx"));
const Studio = lazy(() => import("./pages/Studio.tsx"));
const InvitationPage = lazy(() => import("./pages/InvitationPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Quiet loading fallback for route transitions, in keeping with the studio.
function RouteLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[1.5rem] leading-none tracking-[0.16em]">
          LAMSA
        </span>
        <span className="mb-[0.55em] size-[4px] bg-[var(--red)]" />
      </div>
      <span className="relative mt-5 block h-px w-20 overflow-hidden bg-border">
        <span className="absolute inset-y-0 left-0 w-1/3 animate-pulse bg-foreground/40" />
      </span>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              {/* Old sign-in links land in the studio instead of a login wall. */}
              <Route
                path="/auth"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="/dashboard"
                element={
                  <StudioGate>
                    <Dashboard />
                  </StudioGate>
                }
              />
              <Route
                path="/invitations/:id"
                element={
                  <StudioGate>
                    <Editor />
                  </StudioGate>
                }
              />
              <Route
                path="/studio/:id"
                element={
                  <StudioGate>
                    <Studio />
                  </StudioGate>
                }
              />
              <Route path="/i/:slug" element={<InvitationPage />} />
              <Route
                path="/i/:slug/:guestToken"
                element={<InvitationPage />}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
