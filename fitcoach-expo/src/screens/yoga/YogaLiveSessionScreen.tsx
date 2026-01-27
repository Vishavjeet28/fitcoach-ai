import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function YogaLiveSessionScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { session } = route.params as any;
    const poses = session.poses || [];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(poses[0]?.session_duration || 60);
    const [isActive, setIsActive] = useState(false); // Paused by default to let user get ready? Or auto-start. Let's auto-start after 3s.
    const [isFinished, setIsFinished] = useState(false);

    const currentPose = poses[currentIndex];
    const nextPose = poses[currentIndex + 1];

    useEffect(() => {
        // Start session
        setIsActive(true);
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev: number) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            // Pose finished
            handleNextPose();
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const handleNextPose = () => {
        if (currentIndex < poses.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            const nextDuration = poses[currentIndex + 1].session_duration || 60;
            setTimeLeft(nextDuration);
            playChime();
        } else {
            finishSession();
        }
    };

    const finishSession = () => {
        setIsActive(false);
        setIsFinished(true);
        navigation.navigate('YogaCompletion', { session, duration: session.duration_minutes * 60 });
    };

    const playChime = async () => {
        // Sound effect could go here
        // const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/chime.mp3'));
        // await sound.playAsync();
    };

    const togglePause = () => {
        setIsActive(!isActive);
    };

    const skipPose = () => {
        handleNextPose();
    };

    const goBackPose = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setTimeLeft(poses[currentIndex - 1].session_duration || 60);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <MaterialCommunityIcons name="close" size={24} color="#4A5568" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{session.title}</Text>
                <TouchableOpacity onPress={togglePause}>
                    <MaterialCommunityIcons name={isActive ? "pause" : "play"} size={24} color="#4A5568" />
                </TouchableOpacity>
            </View>

            {/* Main Pose View */}
            <View style={styles.mainContent}>
                <View style={styles.poseImageContainer}>
                    <Image source={{ uri: currentPose?.image_url || 'https://via.placeholder.com/300' }} style={styles.poseImage} resizeMode="cover" />
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.poseName}>{currentPose?.name}</Text>
                    <Text style={styles.sanskritName}>{currentPose?.sanskrit_name}</Text>

                    <View style={styles.timerContainer}>
                        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                    </View>

                    <Text style={styles.instruction}>
                        {currentPose?.transition_text || currentPose?.instructions || "Breathe deeply and hold the pose."}
                    </Text>
                </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity onPress={goBackPose} disabled={currentIndex === 0} style={[styles.ctrlBtn, currentIndex === 0 && styles.disabledBtn]}>
                    <MaterialCommunityIcons name="skip-previous" size={32} color={currentIndex === 0 ? "#ccc" : "#2D3748"} />
                </TouchableOpacity>

                <TouchableOpacity onPress={togglePause} style={styles.playPauseBtn}>
                    <MaterialCommunityIcons name={isActive ? "pause" : "play"} size={40} color="white" />
                </TouchableOpacity>

                <TouchableOpacity onPress={skipPose} style={styles.ctrlBtn}>
                    <MaterialCommunityIcons name="skip-next" size={32} color="#2D3748" />
                </TouchableOpacity>
            </View>

            {/* Up Next */}
            {nextPose && (
                <View style={styles.upNext}>
                    <Text style={styles.upNextLabel}>UP NEXT</Text>
                    <Text style={styles.upNextName}>{nextPose.name}</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F9F6' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    closeBtn: { padding: 8 },
    headerTitle: { fontSize: 16, fontWeight: '600', color: '#4A5568' },
    mainContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    poseImageContainer: {
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        overflow: 'hidden',
        borderWidth: 8,
        borderColor: 'white',
        elevation: 10,
        shadowColor: '#8DA399',
        shadowOpacity: 0.3,
        shadowRadius: 20,
        marginBottom: 40,
    },
    poseImage: { width: '100%', height: '100%' },
    infoContainer: { alignItems: 'center' },
    poseName: { fontSize: 28, fontWeight: '700', color: '#2D3748', textAlign: 'center', marginBottom: 5 },
    sanskritName: { fontSize: 18, color: '#8DA399', fontStyle: 'italic', marginBottom: 20 },
    timerContainer: { marginBottom: 20 },
    timerText: { fontSize: 48, fontWeight: '300', color: '#2D3748', fontVariant: ['tabular-nums'] },
    instruction: { fontSize: 16, color: '#4A5568', textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingBottom: 40,
    },
    ctrlBtn: { padding: 10 },
    disabledBtn: { opacity: 0.5 },
    playPauseBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#8DA399',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
    },
    upNext: {
        position: 'absolute',
        bottom: 120,
        alignSelf: 'center',
        alignItems: 'center',
        opacity: 0.6,
    },
    upNextLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
    upNextName: { fontSize: 14, fontWeight: '600' },
});
