import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";

type WaterLog = {
  id: string;
  amount_ml: number;
  created_at: string;
};

const { width } = Dimensions.get("window");
const RING_SIZE = Math.min(width * 0.5, 200);

export default function HydrationScreen() {
  const DAILY_GOAL = 3000; // ml

  const [total, setTotal] = useState(0);
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState(false);

  // Fetch hydration data
  const fetchHydration = async () => {
    try {
      setLoading(true);
      setSyncError(false);

      const [totalsRes, logsRes] = await Promise.all([
        api.get("/water/totals"),
        api.get("/water/logs"),
      ]);

      setTotal(totalsRes.data.total_ml || 0);
      setLogs(logsRes.data.logs || []);
    } catch (err) {
      setSyncError(true);
    } finally {
      setLoading(false);
    }
  };

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchHydration();
    }, [])
  );

  // Add water with optimistic UI update
  const addWater = async (amount: number) => {
    if (saving) return;

    try {
      setSaving(true);
      setSyncError(false);

      // Optimistic update
      const newTotal = total + amount;
      setTotal(newTotal);

      // Backend save
      await api.post("/water/logs", {
        amount_ml: amount,
      });

      // Refresh to get actual data
      await fetchHydration();
    } catch (err) {
      // Revert on error
      setTotal(total);
      setSyncError(true);
    } finally {
      setSaving(false);
    }
  };

  const progress = Math.min(total / DAILY_GOAL, 1);
  const liters = (total / 1000).toFixed(1);
  const goalLiters = (DAILY_GOAL / 1000).toFixed(1);

  // Encouragement messages
  const getMessage = () => {
    if (total === 0) return "Start with a few sips 💧";
    if (progress >= 1) return "Amazing! You hit your goal today 🎉";
    if (progress >= 0.75) return "Almost there! Keep it up";
    if (progress >= 0.5) return "Nice! You're halfway there";
    if (progress >= 0.25) return "Good start! A few more sips";
    return "Every sip counts";
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4da6ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sync Error Banner */}
        {syncError && (
          <Pressable style={styles.errorBanner} onPress={fetchHydration}>
            <Text style={styles.errorText}>Couldn't sync — tap to retry</Text>
          </Pressable>
        )}

        {/* Primary Visual: Circular Progress */}
        <View style={styles.progressSection}>
          <View style={styles.ringContainer}>
            {/* Background ring */}
            <View style={[styles.ring, styles.ringBackground]} />
            
            {/* Progress ring */}
            <View 
              style={[
                styles.ring, 
                styles.ringProgress,
                { 
                  borderColor: progress >= 1 ? "#13ec80" : "#4da6ff",
                  borderTopWidth: RING_SIZE * 0.12,
                  borderRightWidth: progress >= 0.25 ? RING_SIZE * 0.12 : 0,
                  borderBottomWidth: progress >= 0.5 ? RING_SIZE * 0.12 : 0,
                  borderLeftWidth: progress >= 0.75 ? RING_SIZE * 0.12 : 0,
                }
              ]} 
            />

            {/* Center text */}
            <View style={styles.ringCenter}>
              <Text style={styles.amountLarge}>{liters}L</Text>
              <Text style={styles.amountSmall}>of {goalLiters}L</Text>
            </View>
          </View>

          {/* Encouragement */}
          <Text style={styles.encouragement}>{getMessage()}</Text>
        </View>

        {/* Quick Add Buttons (MOST IMPORTANT) */}
        <View style={styles.quickAddSection}>
          {[250, 500, 750].map((amt) => (
            <Pressable
              key={amt}
              style={({ pressed }) => [
                styles.quickButton,
                pressed && styles.quickButtonPressed,
                saving && styles.quickButtonDisabled,
              ]}
              onPress={() => addWater(amt)}
              disabled={saving}
            >
              <Text style={styles.quickButtonAmount}>+{amt}</Text>
              <Text style={styles.quickButtonLabel}>ml</Text>
            </Pressable>
          ))}
        </View>

        {/* Today's History */}
        {logs.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Today</Text>
            {logs.slice(0, 5).map((log) => (
              <View key={log.id} style={styles.historyItem}>
                <Text style={styles.historyAmount}>+{log.amount_ml} ml</Text>
                <Text style={styles.historyTime}>
                  {new Date(log.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {logs.length === 0 && total === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Tap a button above to start</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  errorBanner: {
    backgroundColor: "#ffebee",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  progressSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  ring: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
  },
  ringBackground: {
    borderWidth: RING_SIZE * 0.12,
    borderColor: "#f0f0f0",
  },
  ringProgress: {
    borderWidth: 0,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
    transform: [{ rotate: "-90deg" }],
  },
  ringCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  amountLarge: {
    fontSize: 48,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -1,
  },
  amountSmall: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  encouragement: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  quickAddSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 48,
    gap: 12,
  },
  quickButton: {
    flex: 1,
    backgroundColor: "#4da6ff",
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4da6ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  quickButtonPressed: {
    transform: [{ scale: 0.95 }],
    shadowOpacity: 0.1,
  },
  quickButtonDisabled: {
    opacity: 0.5,
  },
  quickButtonAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.5,
  },
  quickButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  historySection: {
    marginTop: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  historyTime: {
    fontSize: 14,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
});
