import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import AdminShell, { adminStyles as s } from "../../components/admin/AdminShell";
import { BarChart, LineChart, RankBars } from "../../components/admin/Charts";
import { getAdminAnalytics } from "../../api";

// GigMatch — system analytics.
// Route: app/admin/analytics  →  "/admin/analytics"
//
// Growth over time, bookings per month, the most-requested genres and
// instruments, rating health, and how long verification and disputes take.

const RANGES = [
  { months: 3, label: "3mo" },
  { months: 6, label: "6mo" },
  { months: 12, label: "12mo" },
];

export default function AdminAnalytics() {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await getAdminAnalytics(months));
    } catch (err) {
      setError(err.message || "Couldn't load analytics.");
    }
  }, [months]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const turnaround = data?.turnaround;
  const ratings = data?.ratings;

  return (
    <AdminShell title="Analytics" subtitle="Growth, bookings, and how fast the team responds.">
      {/* Range picker */}
      <View style={styles.rangeRow}>
        {RANGES.map((r) => {
          const active = r.months === months;
          return (
            <Pressable
              key={r.months}
              onPress={() => setMonths(r.months)}
              style={[styles.rangeChip, active && styles.rangeChipActive]}
            >
              <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {data === null ? (
        <View style={{ alignItems: "center", padding: 40 }}>
          <ActivityIndicator color="#a78bfa" size="large" />
        </View>
      ) : (
        <>
          {/* User growth — line so the trend is readable */}
          <Text style={s.sectionTitle}>User growth</Text>
          <View style={s.card}>
            <LineChart data={data.growth} />
            <Text style={styles.caption}>
              New accounts created each month over the last {data.months} months.
            </Text>
          </View>

          {/* Bookings per month — bars */}
          <Text style={s.sectionTitle}>Bookings completed</Text>
          <View style={s.card}>
            <BarChart data={data.bookingsPerMonth} color="#34d399" />
            <Text style={styles.caption}>
              Gigs marked completed, per month. Cancellations aren't counted.
            </Text>
          </View>

          {/* Top genres & instruments */}
          <Text style={s.sectionTitle}>What members play</Text>
          <View style={s.card}>
            <Text style={s.cardTitle}>Most-listed genres</Text>
            <RankBars data={data.topGenres} color="#d946ef" />
          </View>
          <View style={s.card}>
            <Text style={s.cardTitle}>Most-listed instruments</Text>
            <RankBars data={data.topInstruments} color="#a78bfa" />
          </View>

          {/* Rating health */}
          <Text style={s.sectionTitle}>Ratings</Text>
          <View style={s.card}>
            <View style={styles.bigRow}>
              <View style={styles.bigStat}>
                <Text style={styles.bigValue}>
                  {ratings?.count ? Number(ratings.average).toFixed(1) : "—"}
                </Text>
                <Text style={styles.bigLabel}>Average stars</Text>
              </View>
              <View style={styles.bigStat}>
                <Text style={styles.bigValue}>{ratings?.count ?? 0}</Text>
                <Text style={styles.bigLabel}>Ratings given</Text>
              </View>
            </View>
          </View>

          {/* Turnaround — how fast staff clear the queues */}
          <Text style={s.sectionTitle}>Turnaround</Text>
          <View style={s.card}>
            <TurnRow
              label="ID verifications"
              value={formatHours(turnaround?.verificationHours)}
              count={turnaround?.verificationCount}
              hint="Average time from request to decision"
            />
            <TurnRow
              label="Disputes"
              value={formatDays(turnaround?.disputeDays)}
              count={turnaround?.disputeCount}
              hint="Average time from opening to a recorded decision"
              last
            />
          </View>
        </>
      )}
    </AdminShell>
  );
}

// ------------------------------------------------------------------ bits

function TurnRow({ label, value, count, hint, last }) {
  const hasData = count > 0;
  return (
    <View style={[styles.turnRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.turnLabel}>{label}</Text>
        <Text style={s.muted}>{hint}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.turnValue}>{hasData ? value : "—"}</Text>
        <Text style={s.muted}>{hasData ? `from ${count} cases` : "no data yet"}</Text>
      </View>
    </View>
  );
}

function formatHours(h) {
  const n = Number(h) || 0;
  if (n < 1) return "< 1 hr";
  if (n < 48) return `${Math.round(n)} hrs`;
  return `${(n / 24).toFixed(1)} days`;
}

function formatDays(d) {
  const n = Number(d) || 0;
  if (n < 1) return "< 1 day";
  return `${n.toFixed(1)} days`;
}

const styles = StyleSheet.create({
  rangeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  rangeChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 9,
    alignItems: "center",
  },
  rangeChipActive: {
    borderColor: "rgba(167,139,250,0.6)",
    backgroundColor: "rgba(139,92,246,0.22)",
  },
  rangeText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600" },
  rangeTextActive: { color: "#fff" },

  caption: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },

  bigRow: { flexDirection: "row", gap: 12 },
  bigStat: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 16,
  },
  bigValue: { color: "#fff", fontSize: 28, fontWeight: "700" },
  bigLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 },

  turnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  turnLabel: { color: "#fff", fontSize: 13, fontWeight: "600" },
  turnValue: { color: "#6ee7b7", fontSize: 15, fontWeight: "700" },
});
