import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const colors = {
  primary: '#13ec80',
  primaryDark: '#0fb863',
  backgroundDark: '#102219',
  surfaceDark: '#16261f',
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  warning: '#FBBF24',
  info: '#60A5FA',
  success: '#10B981',
  purple: '#A855F7',
  orange: '#FB7185',
};

const onboardingData = [
  {
    id: 1,
    title: 'AI-Powered Coaching',
    subtitle: 'Personal fitness guidance at your fingertips',
    description: 'Get personalized workout plans, nutrition advice, and meal recommendations powered by advanced AI technology.',
    icon: 'robot-excited',
    color: colors.primary,
  },
  {
    id: 2,
    title: 'Track Your Progress',
    subtitle: 'Monitor every step of your fitness journey',
    description: 'Log workouts, meals, and monitor your body metrics with our comprehensive tracking system.',
    icon: 'chart-line',
    color: colors.info,
  },
  {
    id: 3,
    title: 'Smart Nutrition',
    subtitle: 'Discover recipes tailored to your goals',
    description: 'Generate healthy recipes based on your preferences, dietary restrictions, and fitness goals.',
    icon: 'food-apple',
    color: colors.warning,
  },
  {
    id: 4,
    title: 'Ready to Transform?',
    subtitle: 'Your fitness journey starts now',
    description: 'Join thousands of users who have already transformed their lives with FitCoach AI.',
    icon: 'rocket-launch',
    color: colors.purple,
  },
];

export default function WelcomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ 
        x: width * nextIndex, 
        animated: true 
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({ 
        x: width * prevIndex, 
        animated: true 
      });
    }
  };

  const handleGetStarted = () => {
    // Navigate to Auth screen
    console.log('Navigate to Auth');
  };

  const currentSlide = onboardingData[currentIndex];

  return (
    <LinearGradient
      colors={[colors.backgroundDark, colors.surfaceDark]}
      style={styles.container}
    >
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <View style={[styles.patternCircle, styles.circle1]} />
        <View style={[styles.patternCircle, styles.circle2]} />
        <View style={[styles.patternCircle, styles.circle3]} />
      </View>

      {/* Skip Button */}
      {currentIndex < onboardingData.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleGetStarted}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Logo */}
      <View style={styles.logoContainer}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.logoGradient}
        >
          <MaterialCommunityIcons name="heart-pulse" size={40} color={colors.backgroundDark} />
        </LinearGradient>
        <Text style={styles.logoText}>FitCoach AI</Text>
      </View>

      {/* Content Slider */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.contentContainer}
      >
        {onboardingData.map((slide, index) => (
          <View key={slide.id} style={styles.slideContainer}>
            <Animated.View style={[styles.slide, { opacity: index === currentIndex ? fadeAnim : 1 }]}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: `${slide.color}20` }]}>
                <MaterialCommunityIcons 
                  name={slide.icon as any} 
                  size={80} 
                  color={slide.color} 
                />
              </View>

              {/* Content */}
              <View style={styles.textContainer}>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
                <Text style={styles.description}>{slide.description}</Text>
              </View>
            </Animated.View>
          </View>
        ))}
      </ScrollView>

      {/* Page Indicators */}
      <View style={styles.indicatorContainer}>
        {onboardingData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor: index === currentIndex ? colors.primary : colors.textTertiary,
                width: index === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentIndex > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handlePrevious}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />

        {currentIndex < onboardingData.length - 1 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.backgroundDark} />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.getStartedButtonGradient}
            >
              <MaterialCommunityIcons name="rocket-launch" size={20} color={colors.backgroundDark} />
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Features */}
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="shield-check" size={16} color={colors.primary} />
          <Text style={styles.featureText}>Secure & Private</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="star" size={16} color={colors.warning} />
          <Text style={styles.featureText}>Premium Quality</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="account-group" size={16} color={colors.info} />
          <Text style={styles.featureText}>Community Driven</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.03,
  },
  circle1: {
    width: 200,
    height: 200,
    backgroundColor: colors.primary,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 150,
    height: 150,
    backgroundColor: colors.info,
    bottom: 100,
    left: -75,
  },
  circle3: {
    width: 120,
    height: 120,
    backgroundColor: colors.warning,
    top: height * 0.3,
    right: -60,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  contentContainer: {
    flex: 1,
  },
  slideContainer: {
    width: width,
    paddingHorizontal: 24,
  },
  slide: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textTertiary,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  spacer: {
    flex: 1,
  },
  nextButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  nextButtonText: {
    color: colors.backgroundDark,
    fontSize: 16,
    fontWeight: '600',
  },
  getStartedButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  getStartedButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  getStartedButtonText: {
    color: colors.backgroundDark,
    fontSize: 16,
    fontWeight: '600',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
});