import './index.css';

import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { navigateTo, showToast } from '@devvit/web/client';
import type { MetalKey, MetalPrice, ShareRequest } from '../shared/api';
import { parsePricesResponse, parseShareResponse } from '../shared/api';
import {
  METALS,
  METAL_LABELS,
  formatPricePerOz,
  formatUsd,
} from '../shared/metals';
import type { HoldingLine } from '../shared/stack';
import { isValidHoldingLine, lineValue, stackTotals } from '../shared/stack';

const SOURCE_LABELS: Record<string, string> = {
  yahoo: 'Live',
  'gold-api': 'Live',
  metalpriceapi: 'Live',
  moderator: 'Reference price',
  none: 'Unavailable',
};

let nextLineId = 1;

const newLine = (metal: MetalKey): HoldingLine => ({
  id: nextLineId++,
  metal,
  weight: 1,
  unit: 'oz',
  purity: 99.9,
  quantity: 1,
});

export const App = () => {
  const [lines, setLines] = useState<HoldingLine[]>(() => [
    newLine('gold'),
    newLine('silver'),
  ]);
  const [prices, setPrices] = useState<MetalPrice[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sharing, setSharing] = useState(false);

  const loadPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/prices');
      if (!res.ok) {
        throw new Error('prices request failed');
      }
      const data = parsePricesResponse(await res.json());
      if (data === null) {
        throw new Error('prices response was not the expected shape');
      }
      setPrices(data.prices);
      setFetchedAt(data.fetchedAt);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => void loadPrices(), 60_000);
    const initial = setTimeout(() => void loadPrices(), 0);
    return () => {
      clearInterval(timer);
      clearTimeout(initial);
    };
  }, [loadPrices]);

  const priceByMetal = useMemo(() => {
    const map = new Map<MetalKey, MetalPrice>();
    for (const entry of prices ?? []) {
      map.set(entry.metal, entry);
    }
    return map;
  }, [prices]);

  const lineValues = useMemo(
    () =>
      lines.map((line) => ({
        line,
        value: lineValue(
          line,
          priceByMetal.get(line.metal)?.priceUsdPerTroyOz ?? null
        ),
      })),
    [lines, priceByMetal]
  );

  const totals = useMemo(() => stackTotals(lineValues), [lineValues]);
  const hasPricedLine = totals.pricedLines > 0;
  const allLinesValid = lines.every(isValidHoldingLine);

  const updatedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('en-US', { hour12: false })
    : '—';

  const updateLine = (id: number, patch: Partial<HoldingLine>) => {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  };

  const removeLine = (id: number) => {
    setLines((current) => current.filter((line) => line.id !== id));
  };

  const shareAsPost = async () => {
    if (!hasPricedLine || sharing || !allLinesValid) {
      return;
    }
    setSharing(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: lineValues.map((entry) => ({
            metal: entry.line.metal,
            weight: entry.line.weight,
            unit: entry.line.unit,
            purity: entry.line.purity,
            quantity: entry.line.quantity,
            value: entry.value,
          })),
          lineCount: totals.lineCount,
          pricedLines: totals.pricedLines,
          unpricedLines: totals.unpricedLines,
          totalValue: totals.totalValue,
          dealerValue: totals.totalDealerValue,
        } satisfies ShareRequest),
      });
      if (!res.ok) {
        throw new Error('share failed');
      }
      const data = parseShareResponse(await res.json());
      if (data === null) {
        throw new Error('share response was not the expected shape');
      }
      showToast('Stack card shared to your community');
      navigateTo(data.url);
    } catch {
      showToast('Sharing failed — please try again');
    } finally {
      setSharing(false);
    }
  };

  const copySummary = async () => {
    if (!hasPricedLine) {
      return;
    }
    const parts = lineValues.map((entry) => {
      const unitLabel = entry.line.unit === 'g' ? 'g' : 'troy oz';
      const value =
        entry.value === null ? 'no live price' : formatUsd(entry.value);
      return `${entry.line.quantity} x ${entry.line.weight} ${unitLabel} ${METAL_LABELS[entry.line.metal]} (${entry.line.purity}%) — ${value}`;
    });
    const summary =
      `My stack is worth about ${formatUsd(totals.totalValue)} ` +
      `(${formatUsd(totals.totalDealerValue)} dealer value). ` +
      parts.join('; ') +
      `. Estimated with Stack Value Card by Agate Metals — estimates only, not financial advice.`;
    try {
      await navigator.clipboard.writeText(summary);
      showToast('Summary copied — paste it anywhere on Reddit');
    } catch {
      showToast('Copy not available here — use Share as a post instead');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1a2e] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-4 py-4">
        <header className="text-center">
          <p className="text-[0.72rem] font-semibold tracking-[0.25em] text-[#d4af37]">
            AGATE METALS • LIVE REFERENCE
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight">
            Stack Value Card
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Add every piece you own — see what the whole stack is worth
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {loading && prices === null ? (
              <span className="inline-block h-4 w-40 animate-pulse rounded bg-white/20" />
            ) : (
              METALS.map((entry) => {
                const price = priceByMetal.get(entry.key);
                return (
                  <span
                    key={entry.key}
                    className="rounded-full border border-[#d4af37]/40 bg-white/5 px-3 py-1 text-xs font-semibold text-[#d4af37]"
                  >
                    {entry.label}{' '}
                    {price?.priceUsdPerTroyOz === null ||
                    price?.priceUsdPerTroyOz === undefined
                      ? '— no live price'
                      : `${formatPricePerOz(price.priceUsdPerTroyOz)} / oz`}
                  </span>
                );
              })
            )}
          </div>
          <p className="mt-1 text-[0.72rem] text-white/60">
            Updated {updatedLabel} • Refreshes every 60 seconds
          </p>
        </header>

        {loadError && prices === null ? (
          <div className="mt-6 rounded-xl border border-red-400/50 bg-red-500/10 p-4 text-center">
            <p className="font-semibold">Couldn&apos;t load live prices</p>
            <p className="mt-1 text-sm text-white/70">
              Check your connection and try again. Reference prices may still be
              available once the app reconnects.
            </p>
            <button
              className="mt-3 cursor-pointer rounded-full bg-[#d4af37] px-4 py-2 text-sm font-bold text-[#0a1a2e]"
              onClick={() => {
                setLoading(true);
                setLoadError(false);
                void loadPrices();
              }}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <section className="mt-4 space-y-3">
              {loading && prices === null ? (
                <div className="rounded-2xl bg-white p-4">
                  <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
                  <div className="mt-3 h-10 animate-pulse rounded-lg bg-slate-200" />
                  <div className="mt-3 h-16 animate-pulse rounded-lg bg-slate-200" />
                </div>
              ) : (
                lineValues.map((entry) => {
                  const line = entry.line;
                  const price = priceByMetal.get(line.metal);
                  return (
                    <div
                      key={line.id}
                      className="rounded-2xl bg-white p-4 text-[#0a1a2e] shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <select
                          className="cursor-pointer rounded-lg border border-slate-300 px-2 py-2 text-sm font-bold outline-none focus:border-[#d4af37]"
                          value={line.metal}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (
                              value === 'silver' ||
                              value === 'gold' ||
                              value === 'platinum' ||
                              value === 'palladium' ||
                              value === 'rhodium'
                            ) {
                              updateLine(line.id, { metal: value });
                            }
                          }}
                          aria-label="Metal"
                        >
                          {METALS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm font-bold">
                          {entry.value === null
                            ? '— no live price'
                            : formatUsd(entry.value)}
                        </span>
                        <button
                          className="cursor-pointer rounded-full bg-slate-200 px-2 py-1 text-xs font-bold"
                          onClick={() => removeLine(line.id)}
                          aria-label="Remove this line"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-xs font-semibold tracking-wide text-slate-500">
                            WEIGHT (EACH)
                          </span>
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold outline-none focus:border-[#d4af37]"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={line.weight}
                            onChange={(e) =>
                              updateLine(line.id, {
                                weight: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold tracking-wide text-slate-500">
                            QUANTITY
                          </span>
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold outline-none focus:border-[#d4af37]"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.id, {
                                quantity: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs font-semibold tracking-wide text-slate-500">
                            UNIT
                          </span>
                          <div className="mt-1 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                            <button
                              className={`cursor-pointer rounded-md px-2 py-2 text-sm font-semibold ${
                                line.unit === 'oz'
                                  ? 'bg-[#0a1a2e] text-white'
                                  : 'text-slate-600'
                              }`}
                              onClick={() =>
                                updateLine(line.id, { unit: 'oz' })
                              }
                            >
                              Troy Oz
                            </button>
                            <button
                              className={`cursor-pointer rounded-md px-2 py-2 text-sm font-semibold ${
                                line.unit === 'g'
                                  ? 'bg-[#0a1a2e] text-white'
                                  : 'text-slate-600'
                              }`}
                              onClick={() => updateLine(line.id, { unit: 'g' })}
                            >
                              Gram
                            </button>
                          </div>
                        </div>
                        <label className="block">
                          <span className="text-xs font-semibold tracking-wide text-slate-500">
                            PURITY %
                          </span>
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold outline-none focus:border-[#d4af37]"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            step="0.1"
                            value={line.purity}
                            onChange={(e) =>
                              updateLine(line.id, {
                                purity: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                      {price ? (
                        <p className="mt-2 text-[0.7rem] text-slate-500">
                          {METAL_LABELS[line.metal]}{' '}
                          {price.priceUsdPerTroyOz === null
                            ? '— no live price'
                            : `${formatPricePerOz(price.priceUsdPerTroyOz)} / oz`}{' '}
                          • {SOURCE_LABELS[price.source] ?? price.source}
                          {price.source === 'moderator'
                            ? ' — moderator reference price'
                            : ''}
                        </p>
                      ) : null}
                      {!isValidHoldingLine(line) ? (
                        <p className="mt-2 text-[0.7rem] font-semibold text-red-600">
                          Check this line: weight and purity must be above 0,
                          purity at most 100%, quantity a whole number above 0.
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </section>

            <button
              className="mt-3 w-full cursor-pointer rounded-full border-2 border-[#d4af37] px-3 py-2.5 text-sm font-bold text-[#d4af37]"
              onClick={() =>
                setLines((current) => [...current, newLine('silver')])
              }
            >
              + Add a line
            </button>

            <section className="mt-4 rounded-2xl bg-[#d4af37] p-4 text-center text-[#0a1a2e] shadow-lg">
              <p className="text-xs font-semibold tracking-[0.2em]">
                TOTAL ESTIMATED VALUE
              </p>
              <p className="mt-1 text-3xl font-bold">
                {hasPricedLine ? formatUsd(totals.totalValue) : '—'}
              </p>
              <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-[#0a1a2e]/60">
                TOTAL DEALER VALUE (95%)
              </p>
              <p className="text-xl font-semibold">
                {hasPricedLine ? formatUsd(totals.totalDealerValue) : '—'}
              </p>
              <p className="mt-2 text-[0.72rem] font-semibold">
                {totals.lineCount} line{totals.lineCount === 1 ? '' : 's'} •{' '}
                {totals.pricedLines} priced
                {totals.unpricedLines > 0
                  ? ` • ${totals.unpricedLines} line${totals.unpricedLines === 1 ? '' : 's'} with no live price — not counted in the total`
                  : ''}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="cursor-pointer rounded-full bg-[#0a1a2e] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() => void shareAsPost()}
                  disabled={!hasPricedLine || sharing || !allLinesValid}
                >
                  {sharing ? 'Sharing…' : 'Share as a post'}
                </button>
                <button
                  className="cursor-pointer rounded-full border-2 border-[#0a1a2e] px-3 py-2.5 text-sm font-bold text-[#0a1a2e] disabled:opacity-50"
                  onClick={() => void copySummary()}
                  disabled={!hasPricedLine}
                >
                  Copy summary
                </button>
              </div>
            </section>
          </>
        )}

        <footer className="mt-5 pb-2 text-center text-[0.72rem] leading-relaxed text-white/60">
          <p>
            All figures are estimates based on live reference prices — not
            quotes, and not financial advice. Rhodium has no free live source:
            lines for it show &ldquo;no live price&rdquo; unless a moderator
            reference price or a Metal Price API key covers it.
          </p>
          <p className="mt-2 flex justify-center gap-3">
            <button
              className="cursor-pointer underline"
              onClick={() =>
                navigateTo('https://agatepreciousmetals.com/terms.html')
              }
            >
              Terms
            </button>
            <span>•</span>
            <button
              className="cursor-pointer underline"
              onClick={() =>
                navigateTo('https://agatepreciousmetals.com/privacy.html')
              }
            >
              Privacy
            </button>
            <span>•</span>
            <button
              className="cursor-pointer underline"
              onClick={() => navigateTo('https://agatemetals.com/')}
            >
              agatemetals.com
            </button>
          </p>
        </footer>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
