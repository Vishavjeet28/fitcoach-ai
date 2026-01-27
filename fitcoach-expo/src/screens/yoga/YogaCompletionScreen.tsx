import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function YogaCompletionScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { session, duration } = route.params as any;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        // Note: Session logging is skipped in guest mode
        // When auth is working, re-enable the logging API call here
        console.log('🧘 [YOGA] Session completed:', session?.title, 'Duration:', duration, 'seconds');

        // Animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                useNativeDriver: true,
            })
        ]).start();

    }, []);

    const handleDone = () => {
        // Navigate back to main tabs
        navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
        });
    };

    const handleDoAnother = () => {
        // Go back to yoga home
        navigation.navigate('YogaMain');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="meditation" size={80} color="white" />
                </View>

                <Text style={styles.title}>Namaste</Text>
                <Text style={styles.subtitle}>Session Complete</Text>

                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>{Math.round((duration || 0) / 60)}</Text>
                        <Text style={styles.statLabel}>Minutes</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>{session?.poses?.length || 0}</Text>
                        <Text style={styles.statLabel}>Poses</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>~{session?.calories_estimate || 0}</Text>
                        <Text style={styles.statLabel}>Calories</Text>
                    </View>
                </View>

                <Text style={styles.message}>
                    "The body benefits from movement, and the mind benefits from stillness."
                </Text>

                <Text style={styles.sessionTitle}>{session?.title}</Text>
            </Animated.View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleDoAnother}>
                    <MaterialCommunityIcons name="yoga" size={20} color="#8DA399" />
                    <Text style={styles.secondaryButtonText}>Practice More</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleDone}>
                    <Text style={styles.buttonText}>Continue Day</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#8DA399',
        justifyContent: 'space-between',
        padding: 30
    },
    content: {
        alignItems: 'center',
        marginTop: 40
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    title: {
        fontSize: 42,
        fontWeight: '700',
        color: 'white',
        marginBottom: 10
    },
    subtitle: {
        fontSize: 20,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 40,
        letterSpacing: 1
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
    },
    statItem: {
        alignItems: 'center'
    },
    statVal: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2D3748'
    },
    statLabel: {
        fontSize: 12,
        color: '#718096',
        textTransform: 'uppercase',
        marginTop: 4
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: '#E2E8F0'
    },
    message: {
        marginTop: 40,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        fontStyle: 'italic',
        fontSize: 16,
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    sessionTitle: {
        marginTop: 20,
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    buttonContainer: {
        gap: 12,
    },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        height: 50,
        borderRadius: 25,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        marginLeft: 8,
    },
    button: {
        backgroundColor: 'white',
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
    },
    buttonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#8DA399'
    },
});
