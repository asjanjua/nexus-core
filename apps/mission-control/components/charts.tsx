/**
 * Pure SVG chart primitives for NexusAI Mission Control.
 *
 * Zero external dependencies. All components are server-renderable.
 * Styled to the nexus dark design system.
 *
 * Exports:
 *   DonutChart        - multi-segment ring chart with legend
 *   HorizontalBarChart - labeled horizontal bars with threshold coloring
 *   GaugeChart         - semicircle gauge for single 0-1 metrics
 *   RadarChart         - pentagon spider chart for 5-dimension scoring
 *   MiniStat           - inline KPI tile with label + value + optional delta
 */

// ---------------------------------------------------------------------------
// Design tokens (match tailwind.config.ts nexus colors)
// ---------------------------------------------------------------------------
export const C = {
  accent: "#2ed3b7",   // teal  - positive / processed
  warn:   "#f0b429",   // amber - warning / in_review
  danger: "#ef6b73",   // red   - critical / quarantined
  purple: "#a78bfa",   // violet- draft / open
  blue:   "#60a5fa",   // blue  - neutral / additional
  muted:  "#2a3654",   // dark grey - background / empty
  text:   "#dbe7ff",
  sub:    "#9db0d1",
  bg:     "#0b1220",
  panel:  "#101a2f",
  border: "#2a3654",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180); // -90 so 0° is top
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

function donutSegmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number
): string {
  const os = polarToXY(cx, cy, outerR, startDeg);
  const oe = polarToXY(cx, cy, outerR, endDeg);
  const is = polarToXY(cx, cy, innerR, startDeg);
  const ie = polarToXY(cx, cy, innerR, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${is.x} ${is.y}`,
    "Z",
  ].join(" ");
}

// ---------------------------------------------------------------------------
// DonutChart
// ---------------------------------------------------------------------------

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  size?: number;           // svg width/height
  outerR?: number;
  innerR?: number;
  centerLabel?: string;    // e.g. "12"
  centerSub?: string;      // e.g. "total"
  title?: string;
};

export function DonutChart({
  segments,
  size = 180,
  outerR = 70,
  innerR = 46,
  centerLabel,
  centerSub,
  title,
}: DonutChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  const paths: { d: string; color: string }[] = [];
  let cursor = -90; // start from top

  if (total === 0) {
    // Empty state: single grey ring
    paths.push({
      d: donutSegmentPath(cx, cy, outerR, innerR, -90, 269.999),
      color: C.muted,
    });
  } else {
    for (const seg of segments) {
      if (seg.value <= 0) continue;
      const span = (seg.value / total) * 360;
      const end = cursor + span - 0.5; // small gap between segments
      paths.push({ d: donutSegmentPath(cx, cy, outerR, innerR, cursor, end), color: seg.color });
      cursor += span;
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {title && <p className="text-xs uppercase tracking-wide text-white/50">{title}</p>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={title}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} opacity={0.9} />
        ))}
        {centerLabel && (
          <text
            x={cx}
            y={cy + 6}
            textAnchor="middle"
            fill={C.text}
            fontSize={22}
            fontWeight="600"
            fontFamily="system-ui"
          >
            {centerLabel}
          </text>
        )}
        {centerSub && (
          <text
            x={cx}
            y={cy + 22}
            textAnchor="middle"
            fill={C.sub}
            fontSize={10}
            fontFamily="system-ui"
          >
            {centerSub}
          </text>
        )}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-white/60">
              {seg.label} {total > 0 ? `(${seg.value})` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HorizontalBarChart
// ---------------------------------------------------------------------------

export type BarItem = {
  label: string;
  value: number;
  color?: string;
};

type HorizontalBarChartProps = {
  data: BarItem[];
  maxValue?: number;
  title?: string;
  unit?: string;
  warnAbove?: number;
  dangerAbove?: number;
};

export function HorizontalBarChart({
  data,
  maxValue,
  title,
  unit = "",
  warnAbove,
  dangerAbove,
}: HorizontalBarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const barH = 20;
  const gap = 10;
  const labelW = 110;
  const valW = 36;
  const barAreaW = 180;
  const totalW = labelW + barAreaW + valW;
  const totalH = data.length * (barH + gap) + gap;

  function barColor(item: BarItem): string {
    if (item.color) return item.color;
    if (dangerAbove !== undefined && item.value >= dangerAbove) return C.danger;
    if (warnAbove !== undefined && item.value >= warnAbove) return C.warn;
    return C.accent;
  }

  return (
    <div className="flex flex-col gap-2">
      {title && <p className="text-xs uppercase tracking-wide text-white/50">{title}</p>}
      <svg
        width="100%"
        viewBox={`0 0 ${totalW} ${totalH}`}
        aria-label={title}
        style={{ overflow: "visible" }}
      >
        {data.map((item, i) => {
          const y = gap + i * (barH + gap);
          const barW = max > 0 ? (item.value / max) * barAreaW : 0;
          const color = barColor(item);

          return (
            <g key={item.label}>
              {/* Label */}
              <text
                x={labelW - 8}
                y={y + barH / 2 + 4}
                textAnchor="end"
                fill={C.sub}
                fontSize={11}
                fontFamily="system-ui"
              >
                {item.label}
              </text>
              {/* Background track */}
              <rect
                x={labelW}
                y={y}
                width={barAreaW}
                height={barH}
                rx={4}
                fill={C.muted}
                opacity={0.4}
              />
              {/* Value bar */}
              {barW > 0 && (
                <rect
                  x={labelW}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill={color}
                  opacity={0.85}
                />
              )}
              {/* Value label */}
              <text
                x={labelW + barAreaW + 6}
                y={y + barH / 2 + 4}
                fill={C.text}
                fontSize={11}
                fontFamily="system-ui"
                fontWeight="600"
              >
                {item.value}{unit}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GaugeChart (semicircle)
// ---------------------------------------------------------------------------

type GaugeChartProps = {
  value: number;       // 0 to 1
  label: string;
  sublabel?: string;
  size?: number;
};

export function GaugeChart({ value, label, sublabel, size = 200 }: GaugeChartProps) {
  const cx = size / 2;
  const cy = size * 0.56;  // slightly below center so arc fits
  const r = size * 0.38;
  const strokeW = size * 0.07;
  const clampedVal = Math.max(0, Math.min(1, value));
  const pct = Math.round(clampedVal * 100);

  // Color thresholds
  const color = clampedVal >= 0.75 ? C.accent : clampedVal >= 0.5 ? C.warn : C.danger;

  // End point for value arc
  const endX = cx - r * Math.cos(clampedVal * Math.PI);
  const endY = cy - r * Math.sin(clampedVal * Math.PI);
  const largeArc = clampedVal > 0.5 ? 1 : 0;

  const bgArcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const valArcPath =
    clampedVal <= 0
      ? ""
      : `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`} aria-label={label}>
        {/* Background arc */}
        <path
          d={bgArcPath}
          fill="none"
          stroke={C.muted}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {valArcPath && (
          <path
            d={valArcPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}
        {/* Percentage text */}
        <text
          x={cx}
          y={cy - r * 0.15}
          textAnchor="middle"
          fill={C.text}
          fontSize={size * 0.16}
          fontWeight="700"
          fontFamily="system-ui"
        >
          {pct}%
        </text>
        {/* Min / Max labels */}
        <text x={cx - r} y={cy + strokeW + 14} textAnchor="middle" fill={C.sub} fontSize={9} fontFamily="system-ui">0%</text>
        <text x={cx + r} y={cy + strokeW + 14} textAnchor="middle" fill={C.sub} fontSize={9} fontFamily="system-ui">100%</text>
      </svg>
      <p className="text-sm font-semibold text-white/80">{label}</p>
      {sublabel && <p className="text-xs text-white/40">{sublabel}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RadarChart (pentagon spider chart for 5 risk dimensions)
// ---------------------------------------------------------------------------

export type RadarDimension = {
  label: string;
  value: number;  // 0 to 1
  color?: string;
};

type RadarChartProps = {
  dimensions: RadarDimension[];
  size?: number;
  title?: string;
};

export function RadarChart({ dimensions, size = 220, title }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;
  const n = dimensions.length;
  const rings = [0.25, 0.5, 0.75, 1.0];

  function vertex(i: number, scale = 1) {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2; // start from top
    return {
      x: cx + scale * r * Math.cos(angle),
      y: cy + scale * r * Math.sin(angle),
    };
  }

  function polygonPoints(scale = 1) {
    return dimensions
      .map((_, i) => {
        const v = vertex(i, scale);
        return `${v.x},${v.y}`;
      })
      .join(" ");
  }

  function valuePolygonPoints() {
    return dimensions
      .map((d, i) => {
        const v = vertex(i, Math.max(0.04, d.value)); // min dot size
        return `${v.x},${v.y}`;
      })
      .join(" ");
  }

  const labelOffset = 1.22;

  return (
    <div className="flex flex-col items-center gap-2">
      {title && <p className="text-xs uppercase tracking-wide text-white/50">{title}</p>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={title ?? "Radar chart"}>
        {/* Grid rings */}
        {rings.map((scale) => (
          <polygon
            key={scale}
            points={polygonPoints(scale)}
            fill="none"
            stroke={C.border}
            strokeWidth={1}
            opacity={0.6}
          />
        ))}

        {/* Axis lines */}
        {dimensions.map((_, i) => {
          const v = vertex(i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={v.x}
              y2={v.y}
              stroke={C.border}
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}

        {/* Value polygon (filled) */}
        <polygon
          points={valuePolygonPoints()}
          fill={C.accent}
          fillOpacity={0.18}
          stroke={C.accent}
          strokeWidth={2}
          strokeOpacity={0.8}
        />

        {/* Value dots */}
        {dimensions.map((d, i) => {
          const v = vertex(i, Math.max(0.04, d.value));
          const dotColor = d.color ?? (d.value >= 0.6 ? C.danger : d.value >= 0.35 ? C.warn : C.accent);
          return (
            <circle key={i} cx={v.x} cy={v.y} r={4} fill={dotColor} />
          );
        })}

        {/* Labels */}
        {dimensions.map((d, i) => {
          const v = vertex(i, labelOffset);
          const pct = Math.round(d.value * 100);
          return (
            <g key={i}>
              <text
                x={v.x}
                y={v.y - 4}
                textAnchor="middle"
                fill={C.sub}
                fontSize={9.5}
                fontFamily="system-ui"
                fontWeight="600"
              >
                {d.label}
              </text>
              <text
                x={v.x}
                y={v.y + 8}
                textAnchor="middle"
                fill={pct >= 60 ? C.danger : pct >= 35 ? C.warn : C.accent}
                fontSize={9}
                fontFamily="system-ui"
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill={C.border} />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MiniStat — simple KPI tile
// ---------------------------------------------------------------------------

type MiniStatProps = {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
};

export function MiniStat({ label, value, sub, color = C.accent }: MiniStatProps) {
  return (
    <div className="panel flex flex-col gap-1 items-center text-center">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-white/40">{sub}</p>}
    </div>
  );
}
