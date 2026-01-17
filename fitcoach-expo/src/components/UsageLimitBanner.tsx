import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSubscription } from '../hooks/useSubscription';

const colors = {
    primary: '#26d9bb', // Teal
    backgroundDark: '#FAFAFA', // Light BG (renaming variable might be too much refactor, just remapping values)
    surfaceDark: '#FFFFFF', // White Surface
    warning: '#f59e0b',
    danger: '#ef4444',
    textPrimary: '#1e293b', // Slate 800
    textSecondary: '#64748b',
    border: '#e2e8f0'
};

export const UsageLimitBanner: React.FC = () => {
    const { isFree, aiUsageCount, limit } = useSubscription();
    const navigation = useNavigation<any>();

    // Only show for free users with significant usage (>= 3)
    if (!isFree || aiUsageCount < 3) {
        return null;
    }

    const remaining = Math.max(0, limit - aiUsageCount);
    const progress = Math.min(1, aiUsageCount / limit);
    const isCritical = remaining <= 1;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        {remaining === 0 ? 'Monthly limit reached' : `You have ${remaining} AI calls left`}
                    </Text>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: `${progress * 100}%`,
                                    backgroundColor: isCritical ? colors.danger : colors.warning
                                }
                            ]}
                        />
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('Pricing')}
                >
                    <Text style={styles.buttonText}>Upgrade</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surfaceDark,
        padding: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textContainer: {
        flex: 1,
        marginRight: 16,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '500',
    },
    progressBarBg: {
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
        marginRight: 4,
    }
});
