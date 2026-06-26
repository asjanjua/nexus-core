"use client";

/**
 * Trust Drawer — global state + data-loading for the one slide-over that can
 * open from any confidence badge anywhere in the product (see
 * nexus-design-system skill, "Signature patterns"). This is the physical
 * embodiment of the evidence-first rule: nothing is approved blind, and any
 * confidence number must be one click away from its sources.
 *
 * Callers either:
 *   (a) already have full EvidenceRecord objects in hand (e.g. a server
 *       component that loaded them for the page) and pass them via
 *       `records`, in which case the drawer renders instantly with no
 *       network round-trip, or
 *   (b) only have id/label summaries (e.g. a synthesis answer's source
 *       list), in which case the drawer fetches the missing records from
 *       GET /api/evidence/[id] in parallel and renders a loading state
 *       in the meantime.
 *
 * We never fabricate fields that don't exist in the data (no invented
 * "last reviewed" timestamps — see TrustDrawer's review-status derivation,
 * which is built only from the real `ingestionStatus` field).
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { EvidenceRecord } from "@/lib/contracts";

export interface TrustDrawerSource {
  id: string;
  label?: string;
  sourceType?: string;
  department?: string;
  /** Per-source confidence if the caller has one (distinct from the overall score). */
  confidence?: number;
}

export interface TrustDrawerEntity {
  id: string;
  name: string;
  type: string;
  confidence: number;
}

export interface TrustDrawerOpenOptions {
  title: string;
  /**
   * Null when the caller has no real aggregate confidence score to show
   * (e.g. a Decision backed by evidence but with no single confidence
   * number of its own). The drawer hides the confidence header rather
   * than fabricating a percentage — see the no-fabrication rule above.
   */
  overallConfidence: number | null;
  sources: TrustDrawerSource[];
  entities?: TrustDrawerEntity[];
  /** Already-loaded full records — skips fetching for any id present here. */
  records?: EvidenceRecord[];
}

interface TrustDrawerState {
  open: boolean;
  title: string;
  overallConfidence: number | null;
  sources: TrustDrawerSource[];
  entities: TrustDrawerEntity[];
  records: Record<string, EvidenceRecord>;
  loading: boolean;
}

interface TrustDrawerContextValue {
  state: TrustDrawerState;
  openDrawer: (opts: TrustDrawerOpenOptions) => void;
  closeDrawer: () => void;
}

const INITIAL_STATE: TrustDrawerState = {
  open: false,
  title: "",
  overallConfidence: 0,
  sources: [],
  entities: [],
  records: {},
  loading: false,
};

const TrustDrawerContext = createContext<TrustDrawerContextValue | null>(null);

export function useTrustDrawer(): TrustDrawerContextValue {
  const ctx = useContext(TrustDrawerContext);
  if (!ctx) {
    throw new Error("useTrustDrawer must be used within a TrustDrawerProvider");
  }
  return ctx;
}

export function TrustDrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TrustDrawerState>(INITIAL_STATE);

  const openDrawer = useCallback((opts: TrustDrawerOpenOptions) => {
    const recordMap: Record<string, EvidenceRecord> = {};
    for (const record of opts.records ?? []) {
      recordMap[record.id] = record;
    }

    const missingIds = opts.sources.map((s) => s.id).filter((id) => !recordMap[id]);

    setState({
      open: true,
      title: opts.title,
      overallConfidence: opts.overallConfidence,
      sources: opts.sources,
      entities: opts.entities ?? [],
      records: recordMap,
      loading: missingIds.length > 0,
    });

    if (missingIds.length === 0) return;

    Promise.all(
      missingIds.map(async (id) => {
        try {
          const res = await fetch(`/api/evidence/${id}`);
          if (!res.ok) return null;
          const body = await res.json().catch(() => null);
          return (body?.data as EvidenceRecord | undefined) ?? null;
        } catch {
          return null;
        }
      })
    ).then((fetched) => {
      setState((prev) => {
        if (!prev.open) return prev; // closed before fetch resolved — drop it
        const next = { ...prev.records };
        for (const rec of fetched) {
          if (rec) next[rec.id] = rec;
        }
        return { ...prev, records: next, loading: false };
      });
    });
  }, []);

  const closeDrawer = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <TrustDrawerContext.Provider value={{ state, openDrawer, closeDrawer }}>
      {children}
    </TrustDrawerContext.Provider>
  );
}
