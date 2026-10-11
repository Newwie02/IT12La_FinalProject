import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, Line as SvgLine } from "react-native-svg";

// GigMatch — small hand-rolled charts for the admin dashboard.
// No charting library is installed, so these are drawn directly. Bars are
// plain Views (robust everywhere); the line chart uses react-native-svg.
//
// Both take the same shape of data:
//   [{ label: "2026-10", count: 15 }, ...]
// and render a fixed-height plot with a max value derived from the data.

const CHART_HEIGHT = 140;
const ACCENT = "#a78bfa";

// ---------------------------------------------------------------- Bar chart
export function BarChart({ data = [], color = ACCENT, height = CHART_HEIGHT }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {data.map((d, i) => {
          // A zero count still needs a visible sliver so the month reads as
          // "nothing happened" rather than "this month is missing".
          const h = d.count === 0 ? 2 : Math.max(3, (d.count / max) * (height - 22));
          return (
            <View key={`${d.label}-${i}`} style={styles.barCol}>
              <Text style={styles.barValue}>{d.count || ""}</Text>
              <View style={[styles.bar, { height: h, backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        {data.map((d, i) => (
          <Text key={`${d.label}-${i}`} style={styles.label} numberOfLines={1}>
            {shortMonth(d.label)}
          </Text>
        ))}
      </View>
    </View>
  );
}

// -------------------------------------------------------------- Line chart
export function LineChart({ data = [], color = ACCENT, height = CHART_HEIGHT }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = 320; // logical units; Svg scales to the container
  const pad = 14;
  const innerH = height - pad * 2;

  const points = data.map((d, i) => {
    const x =
      data.length === 1 ? width / 2 : pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + innerH - (d.count / max) * innerH;
    return { x, y, ...d };
  });

  // Straight segments between points. A polyline (not a smoothed curve) so
  // the values on screen match the numbers exactly.
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <View>
      <Svg height={height} width="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* Baseline */}
        <SvgLine
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        {/* A faint max guide line */}
        <SvgLine
          x1={pad}
          y1={pad}
          x2={width - pad}
          y2={pad}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
        <Path d={path} stroke={color} strokeWidth="2.5" fill="none" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} />
        ))}
      </Svg>
      <View style={styles.labelRow}>
        {data.map((d, i) => (
          <Text key={`${d.label}-${i}`} style={styles.label} numberOfLines={1}>
            {shortMonth(d.label)}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ------------------------------------------------- Horizontal ranked bars
// Used for top genres / instruments, where values are names not dates.
export function RankBars({ data = [], color = "#d946ef", limit = 6 }) {
  const rows = data.filter((d) => d.value).slice(0, limit);
  const max = Math.max(1, ...rows.map((r) => r.count));

  if (!rows.length) {
    return <Text style={styles.empty}>No data yet.</Text>;
  }

  return (
    <View style={styles.rankList}>
      {rows.map((r, i) => (
        <View key={`${r.value}-${i}`} style={styles.rankRow}>
          <Text style={styles.rankLabel} numberOfLines={1}>
            {r.value}
          </Text>
          <View style={styles.rankTrack}>
            <View
              style={[
                styles.rankFill,
                { width: `${(r.count / max) * 100}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={styles.rankCount}>{r.count}</Text>
        </View>
      ))}
    </View>
  );
}

// "2026-10" -> "Oct"; falls back to the raw label if it isn't a month key.
function shortMonth(label) {
  const m = /^(\d{4})-(\d{2})$/.exec(label || "");
  if (!m) return label;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[Number(m[2]) - 1] || label;
}

const styles = StyleSheet.create({
  plot: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
  },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: { width: "70%", borderRadius: 4, minHeight: 2 },
  barValue: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginBottom: 4 },

  labelRow: { flexDirection: "row", justifyContent: "space-between", gap: 6, marginTop: 6 },
  label: { flex: 1, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 10 },

  rankList: { gap: 10 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankLabel: { width: 96, color: "rgba(255,255,255,0.8)", fontSize: 12 },
  rankTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  rankFill: { height: 8, borderRadius: 4 },
  rankCount: { width: 30, textAlign: "right", color: "#fff", fontSize: 12, fontWeight: "600" },

  empty: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontStyle: "italic" },
});
