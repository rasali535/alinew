/**
 * Ralion OS — Facebook & Social Analytics Semantics & Provenance Engine
 * Ras Ali Labs (Pty) Ltd
 *
 * Implements strict, hardened telemetry semantics:
 * 1. Numeric metric returned by Meta as 0 -> display 0 (META_LIVE)
 * 2. HTTP 200 with empty data / metric absent -> display "Data Unavailable", not automatically 0 (UNAVAILABLE)
 * 3. OAuth permission error -> display "Permission Required" (UNAVAILABLE / PERMISSION_REQUIRED)
 * 4. Local Ralion post inventory only -> label "Ralion-tracked" (RALION_TRACKED)
 * 5. Algorithmic / derived computations -> label "DERIVED" (DERIVED)
 */

export type AnalyticsSource = 'META_LIVE' | 'RALION_TRACKED' | 'DERIVED' | 'UNAVAILABLE';
export type MetricState = 'AVAILABLE' | 'ZERO' | 'DATA_UNAVAILABLE' | 'PERMISSION_REQUIRED';

export interface FormattedMetric {
  value: number | string | null;
  displayValue: string;
  source: AnalyticsSource;
  state: MetricState;
  sourceLabel: string;
  permissionRequired?: string;
  badgeText: string;
  badgeClass: string;
}

export function formatAnalyticsMetric(params: {
  rawNumericValue?: number | null;
  hasMetaNumeric?: boolean;
  isMetaAbsent?: boolean;
  isPermissionError?: boolean;
  permissionName?: string;
  isRalionTracked?: boolean;
  isDerived?: boolean;
  customUnavailableText?: string;
  fallbackFormatted?: string;
}): FormattedMetric {
  // 1. OAuth permission error -> display "Permission Required"
  if (params.isPermissionError) {
    return {
      value: null,
      displayValue: 'Permission Required',
      source: 'UNAVAILABLE',
      state: 'PERMISSION_REQUIRED',
      sourceLabel: 'Permission Required',
      permissionRequired: params.permissionName || 'pages_read_engagement',
      badgeText: '⚠️ PERMISSION REQUIRED',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
    };
  }

  // 2. Numeric metric explicitly returned by Meta as 0 -> display "0"
  if (params.hasMetaNumeric && params.rawNumericValue === 0) {
    return {
      value: 0,
      displayValue: '0',
      source: 'META_LIVE',
      state: 'ZERO',
      sourceLabel: 'META_LIVE',
      badgeText: '🟢 META_LIVE',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
    };
  }

  // 3. Numeric metric returned by Meta with positive value
  if (params.hasMetaNumeric && typeof params.rawNumericValue === 'number' && params.rawNumericValue > 0) {
    return {
      value: params.rawNumericValue,
      displayValue: params.rawNumericValue.toLocaleString(),
      source: 'META_LIVE',
      state: 'AVAILABLE',
      sourceLabel: 'META_LIVE',
      badgeText: '🟢 META_LIVE',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
    };
  }

  // 4. HTTP 200 with empty data / metric absent -> display "Data Unavailable", not automatically "0"
  if (params.isMetaAbsent) {
    return {
      value: null,
      displayValue: params.customUnavailableText || 'Data Unavailable',
      source: 'UNAVAILABLE',
      state: 'DATA_UNAVAILABLE',
      sourceLabel: 'UNAVAILABLE',
      badgeText: '⚪ UNAVAILABLE',
      badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    };
  }

  // 5. Local Ralion post inventory only -> label "Ralion-tracked"
  if (params.isRalionTracked) {
    const val = typeof params.rawNumericValue === 'number' ? params.rawNumericValue : 0;
    return {
      value: val,
      displayValue: val.toLocaleString(),
      source: 'RALION_TRACKED',
      state: val === 0 ? 'ZERO' : 'AVAILABLE',
      sourceLabel: 'RALION_TRACKED',
      badgeText: '🔷 RALION_TRACKED',
      badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30',
    };
  }

  // 6. Derived metric (e.g. Mari Growth Score, ratios)
  if (params.isDerived) {
    const displayVal = params.fallbackFormatted || (typeof params.rawNumericValue === 'number' ? params.rawNumericValue.toLocaleString() : 'Data Unavailable');
    return {
      value: params.rawNumericValue ?? null,
      displayValue: displayVal,
      source: 'DERIVED',
      state: params.rawNumericValue === null ? 'DATA_UNAVAILABLE' : 'AVAILABLE',
      sourceLabel: 'DERIVED',
      badgeText: '✨ DERIVED',
      badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-500/30',
    };
  }

  // Default fallback
  if (typeof params.rawNumericValue === 'number') {
    return {
      value: params.rawNumericValue,
      displayValue: params.rawNumericValue.toLocaleString(),
      source: 'RALION_TRACKED',
      state: params.rawNumericValue === 0 ? 'ZERO' : 'AVAILABLE',
      sourceLabel: 'RALION_TRACKED',
      badgeText: '🔷 RALION_TRACKED',
      badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30',
    };
  }

  return {
    value: null,
    displayValue: 'Data Unavailable',
    source: 'UNAVAILABLE',
    state: 'DATA_UNAVAILABLE',
    sourceLabel: 'UNAVAILABLE',
    badgeText: '⚪ UNAVAILABLE',
    badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
}
