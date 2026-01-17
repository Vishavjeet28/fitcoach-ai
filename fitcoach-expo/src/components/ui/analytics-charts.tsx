import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Rect, Circle } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 220;
const CHART_WIDTH = SCREEN_WIDTH - 40;
const PADDING = 20;

interface ChartDataPoint {
    date: string;
    value: number;
    value2?: number; // For trend line
}

interface WeightChartProps {
    data: ChartDataPoint[];
    period: string;
}

export const WeightChart = ({ data, period }: WeightChartProps) => {
    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available for this period</Text>
            </View>
        );
    }

    // Min/Max for scaling
    const validValues = data.map(d => d.value).filter(v => v !== null && v > 0);
    const minVal = Math.min(...validValues) - 1;
    const maxVal = Math.max(...validValues) + 1;
    const range = maxVal - minVal || 1;

    const getX = (index: number) => (index / (data.length - 1)) * (CHART_WIDTH - PADDING * 2) + PADDING;
    const getY = (val: number) => CHART_HEIGHT - PADDING - ((val - minVal) / range) * (CHART_HEIGHT - PADDING * 2);

    // Create Paths
    const linePath = data.map((d, i) => 
        d.value ? `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}` : ''
    ).join(' ');

    const trendPath = data.map((d, i) => 
        d.value2 ? `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value2)}` : ''
    ).join(' ');

    return (
        <View style={styles.container}>
            <View style={styles.yAxisOverlay}>
                <Text style={styles.axisLabel}>{maxVal.toFixed(1)}</Text>
                <Text style={styles.axisLabel}>{minVal.toFixed(1)}</Text>
            </View>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                {/* Grid Lines */}
                <Line x1={PADDING} y1={PADDING} x2={CHART_WIDTH-PADDING} y2={PADDING} stroke="rgba(255,255,255,0.1)" />
                <Line x1={PADDING} y1={CHART_HEIGHT-PADDING} x2={CHART_WIDTH-PADDING} y2={CHART_HEIGHT-PADDING} stroke="rgba(255,255,255,0.1)" />
                
                {/* Trend Line (Dashed) */}
                {trendPath.length > 0 && (
                     <Path d={trendPath} stroke="#6B7280" strokeWidth="2" strokeDasharray="5, 5" fill="none" />
                )}

                {/* Weight Line */}
                <Path d={linePath} stroke="#13ec80" strokeWidth="3" fill="none" />
                
                {/* Dots */}
                {data.map((d, i) => (
                    d.value ? (
                        <Circle key={i} cx={getX(i)} cy={getY(d.value)} r="3" fill="#13ec80" />
                    ) : null
                ))}
            </Svg>
            <View style={styles.xAxis}>
                <Text style={styles.dateLabel}>{new Date(data[0].date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</Text>
                <Text style={styles.dateLabel}>{new Date(data[data.length-1].date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</Text>
            </View>
        </View>
    );
};

export const CalorieChart = ({ data }: { data: any[] }) => {
     // Scaled down simple version for now
     if (!data || data.length === 0) return null;
     
     const maxVal = Math.max(
         ...data.map(d => Math.max(d.calories || 0, d.calorie_target || 2000))
     , 2500);

     return (
         <View style={styles.container}>
             <Svg width={CHART_WIDTH} height={150}>
                 {data.map((d, i) => {
                     const x = (i / (data.length - 1 || 1)) * (CHART_WIDTH - 40) + 20;
                     const barHeight = (d.calories / maxVal) * 100;
                     const targetY = 150 - 20 - (d.calorie_target / maxVal) * 100;
                     
                     return (
                         <React.Fragment key={i}>
                             {/* Bar */}
                             <Rect 
                                x={x - 2} 
                                y={150 - 20 - barHeight} 
                                width={4} 
                                height={barHeight} 
                                fill={d.calories > d.calorie_target ? "#FBBF24" : "#13ec80"}
                                rx={2}
                             />
                             {/* Target Line Point */}
                            <Circle cx={x} cy={targetY} r={1.5} fill="#FFF" opacity={0.5} />
                         </React.Fragment>
                     );
                 })}
             </Svg>
         </View>
     )
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        height: CHART_HEIGHT,
        width: CHART_WIDTH,
        backgroundColor: '#16261f',
        borderRadius: 16,
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#16261f',
        borderRadius: 16,
    },
    emptyText: {
        color: '#6B7280',
    },
    yAxisOverlay: {
        position: 'absolute',
        top: 20,
        left: 20,
        bottom: 20,
        justifyContent: 'space-between',
        height: CHART_HEIGHT - 40,
        zIndex: 10
    },
    axisLabel: {
        color: '#6B7280',
        fontSize: 10,
    },
    xAxis: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
        marginTop: -20
    },
    dateLabel: {
        color: '#6B7280',
        fontSize: 10,
    }
});
