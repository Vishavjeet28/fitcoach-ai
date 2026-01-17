import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';

interface CalorieRingProps {
  param: {
    consumed: number;
    target: number;
    burned: number;
    remaining: number;
  };
  size?: number;
}

export const CalorieRing: React.FC<CalorieRingProps> = ({ param, size = 180 }) => {
  const { consumed, target, burned, remaining } = param;
  
  // Calculations for progress
  // Base circle (Target)
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  
  // Consumed progress
  const consumedPercent = Math.min(1, consumed / target);
  const consumedStrokeDashoffset = circumference - (consumedPercent * circumference);
  
  // Burned progress (Outer ring or visual indicator)
  // For simplicity 3D ring effect, we use gradients and shadows
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="gradConsumed" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#13ec80" stopOpacity="1" />
            <Stop offset="1" stopColor="#0fb863" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="gradBackground" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1f3329" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#1f3329" stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        
        {/* Background Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#1f3329" // surfaceLight
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Consumed Progress Circle */}
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#gradConsumed)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={consumedStrokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      
      {/* Center Text */}
      <View style={[styles.centerContent]}>
        <Text style={styles.remainingLabel}>Remaining</Text>
        <Text style={styles.remainingValue}>{Math.round(remaining)}</Text>
        <Text style={styles.unitLabel}>kcal</Text>
        
        <View style={styles.subStats}>
           <Text style={styles.subStatText}>Target: {target}</Text>
           <Text style={styles.subStatText}>•</Text>
           <Text style={styles.subStatText}>Burned: {burned}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remainingLabel: {
    color: '#9CA3AF', // textSecondary
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  remainingValue: {
    color: '#ffffff', // textPrimary
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  unitLabel: {
    color: '#6B7280', // textTertiary
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  subStats: {
    flexDirection: 'row',
    gap: 6,
    opacity: 0.8,
  },
  subStatText: {
    color: '#9CA3AF', // textSecondary
    fontSize: 10,
  }
});
