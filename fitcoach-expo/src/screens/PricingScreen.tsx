import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const colors = {
  primary: '#13ec80',
  primaryDark: '#0fb863',
  backgroundDark: '#102219',
  surfaceDark: '#16261f',
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  accent: '#6366f1' // Using indigo for premium accent
};

const BENEFITS = [
  'Unlimited AI Fitness Coach access',
  'Personalized workout plans',
  'Customized meal suggestions',
  'Deep insights & analytics'
];

const PLANS = [
  {
    id: 'weekly',
    title: 'Weekly',
    price: '₹29',
    period: '/ week',
    label: null,
  },
  {
    id: 'monthly',
    title: 'Monthly',
    price: '₹99',
    period: '/ month',
    label: 'MOST POPULAR',
  },
  {
    id: 'yearly',
    title: 'Yearly',
    price: '₹799',
    period: '/ year',
    label: 'BEST VALUE - SAVE 30%',
  }
];

export default function PricingScreen() {
    const navigation = useNavigation();

    const handleSubscribe = (planId: string) => {
        // Payment integration out of scope
        Alert.alert('Coming Soon', 'Payment integration is in progress.');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Upgrade to Pro</Text>
                    <Text style={styles.subtitle}>Unlock your full fitness potential</Text>
                </View>

                {/* Benefits */}
                <View style={styles.benefitsContainer}>
                    {BENEFITS.map((benefit, index) => (
                        <View key={index} style={styles.benefitRow}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                            <Text style={styles.benefitText}>{benefit}</Text>
                        </View>
                    ))}
                </View>

                {/* Plans */}
                <View style={styles.plansContainer}>
                    {PLANS.map((plan) => (
                        <TouchableOpacity 
                            key={plan.id} 
                            style={[
                                styles.planCard, 
                                plan.id === 'yearly' && styles.recommendedCard
                            ]}
                            onPress={() => handleSubscribe(plan.id)}
                            activeOpacity={0.8}
                        >
                            {plan.label && (
                                <View style={styles.planLabelContainer}>
                                    <Text style={styles.planLabelText}>{plan.label}</Text>
                                </View>
                            )}
                            <View style={styles.planContent}>
                                <View>
                                    <Text style={styles.planTitle}>{plan.title}</Text>
                                    <View style={styles.priceRow}>
                                        <Text style={styles.price}>{plan.price}</Text>
                                        <Text style={styles.period}>{plan.period}</Text>
                                    </View>
                                </View>
                                <MaterialCommunityIcons 
                                    name={plan.id === 'monthly' ? "checkbox-marked-circle-outline" : "circle-outline"} 
                                    size={24} 
                                    color={colors.primary} 
                                />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.footerText}>Cancel anytime. Secure payment.</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundDark,
    },
    scrollContent: {
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    closeButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        padding: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 8,
        marginTop: 16,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    benefitsContainer: {
        marginBottom: 32,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    benefitText: {
        color: colors.textPrimary,
        fontSize: 16,
        marginLeft: 12,
    },
    plansContainer: {
        gap: 16,
    },
    planCard: {
        backgroundColor: colors.surfaceDark,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'visible', // For label
    },
    recommendedCard: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(19, 236, 128, 0.05)',
    },
    planContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    planLabelContainer: {
        position: 'absolute',
        top: -12,
        left: 20,
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    planLabelText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.backgroundDark,
        textTransform: 'uppercase',
    },
    planTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    price: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    period: {
        fontSize: 14,
        color: colors.textSecondary,
        marginLeft: 4,
    },
    footerText: {
        textAlign: 'center',
        color: colors.textTertiary,
        fontSize: 12,
        marginTop: 32,
    }
});
