import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AIService from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { analyticsAPI } from '../services/api';
import { UsageLimitBanner } from '../components/UsageLimitBanner';
import { PaywallModal } from '../components/PaywallModal';
import { useNavigation } from '@react-navigation/native';

// Clean Light Theme
const theme = {
  bg: '#FAFAFA',
  primary: '#26d9bb', // Teal
  primaryDark: '#1fbda1',
  textMain: '#1e293b',
  textSub: '#64748b',
  textTertiary: '#94a3b8',
  surface: '#FFFFFF',
  aiBubble: '#F1F5F9', // Light Slate for AI
  userBubble: '#26d9bb', // Teal for User
  border: '#e2e8f0',
  error: '#ef4444',
  success: '#10b981',
};

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'meal-card';
  mealData?: any;
}

// ----------------------
// ANIMATED COMPONENTS
// ----------------------

// 1. Pulsing Online Dot
const PulsingDot = () => {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.onlineBadge}>
      <Animated.View
        style={[
          styles.onlineDot,
          {
            transform: [{ scale: anim }],
            opacity: anim.interpolate({ inputRange: [1, 1.5], outputRange: [1, 0.4] })
          }
        ]}
      />
      <Text style={styles.onlineText}>Online</Text>
    </View>
  );
};

// 2. Breathing Glow Bubble
const BreathingBubble = ({ children }: { children: React.ReactNode }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false, // shadow props don't support native driver
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8] // Breathe from soft to strong
  });

  const shadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 16] // Expand radius
  });

  return (
    <Animated.View style={[
      styles.bubbleAi,
      {
        shadowOpacity,
        shadowRadius,
      }
    ]}>
      {children}
    </Animated.View>
  );
};

// 3. Bouncing Dots Typing Indicator
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const animateDot = (anim: Animated.Value, delay: number) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: -6,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    animateDot(dot1, 0);
    animateDot(dot2, 200);
    animateDot(dot3, 400);
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', height: 20 }}>
      {[dot1, dot2, dot3].map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.textSub,
            transform: [{ translateY: anim }]
          }}
        />
      ))}
    </View>
  );
};


export default function CoachScreen() {
  const { isLoading, isAuthenticated, refreshUser } = useAuth();
  const { isAiLimitReached, refreshAiUsage } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const isAuthReady = !isLoading;
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation<any>();

  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your personal AI fitness coach. How can I help you reach your goals today?',
      type: 'text'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Stats State
  const [stats, setStats] = useState({
    caloriesLeft: 2000,
    proteinLeft: 150,
    goal: 'Maintenance'
  });

  useEffect(() => {
    fetchDailyStats();
  }, []);

  const fetchDailyStats = async () => {
    try {
      const daily = await analyticsAPI.getDailySummary();
      const s = daily.summary;
      const left = Math.max(0, (s.calorieTarget || 2000) - (s.totalCalories || 0));
      const pLeft = Math.max(0, 150 - (s.totalProtein || 0));
      setStats({
        caloriesLeft: left,
        proteinLeft: pLeft,
        goal: 'Fitness'
      });
    } catch (e) {
      console.log('Error fetching coach stats', e);
    }
  };

  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;

    if (!textToSend.trim() || loading || !isAuthReady) return;

    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to chat with your AI Coach.');
      return;
    }

    if (isAiLimitReached) {
      setShowPaywall(true);
      return;
    }

    // Add User Message
    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: textToSend,
      type: 'text'
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Mock "Recipe" request (Demo Logic preserved)
      if (textToSend.toLowerCase().includes('suggest') || textToSend.toLowerCase().includes('recipe')) {
        setTimeout(() => {
          const aiMsg: Message = {
            id: Date.now() + 1,
            role: 'assistant',
            content: "Here is a high-protein recommendation for you:",
            type: 'meal-card',
            mealData: {
              title: 'Grilled Lemon Chicken',
              image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&q=80',
              calories: 420,
              protein: '45g',
              time: '20 min'
            }
          };
          setMessages(prev => [...prev, aiMsg]);
          setLoading(false);
          refreshUser();
          refreshAiUsage();
        }, 1500);
        return;
      }

      // Normal Chat
      const chatHistory = messages.map(msg => ({ role: msg.role, content: msg.content }));
      chatHistory.push({ role: 'user', content: textToSend });

      const aiResponse = await AIService.chatWithHistory(chatHistory);

      const aiMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiResponse,
        type: 'text'
      };

      setMessages(prev => [...prev, aiMsg]);
      refreshUser();
      refreshAiUsage();
    } catch (error: any) {
      const errorMsg: Message = { id: Date.now() + 1, role: 'assistant', content: 'I encountered an issue connecting to the server. Please try again.' };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      if (!textToSend.toLowerCase().includes('suggest')) setLoading(false);
    }
  };

  const renderStatsHeader = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>Today's Snapshot</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.caloriesLeft}</Text>
          <Text style={styles.statLabel}>Kcal Rem.</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.proteinLeft}g</Text>
          <Text style={styles.statLabel}>Protein Rem.</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>Goal</Text>
          <Text style={styles.statLabel}>{stats.goal}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
      {/* <UsageLimitBanner /> */}

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AI Coach</Text>
          <Text style={styles.headerSubtitle}>Always here to help</Text>
        </View>
        <PulsingDot />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStatsHeader()}

          <View style={styles.chatArea}>
            <Text style={styles.dateDivider}>Today</Text>

            {messages.map((msg) => (
              <View key={msg.id} style={[
                styles.messageRow,
                msg.role === 'user' ? styles.messageRowUser : styles.messageRowAi
              ]}>
                {/* Avatars */}
                {msg.role === 'assistant' && (
                  <View style={styles.avatarAi}>
                    <MaterialCommunityIcons name="robot" size={20} color={theme.primary} />
                  </View>
                )}

                {/* Bubbles */}
                <View style={{ maxWidth: '80%' }}>
                  {msg.role === 'assistant' && <Text style={styles.senderName}>FitCoach AI</Text>}

                  {msg.role === 'assistant' ? (
                    <BreathingBubble>
                      <Text style={styles.msgTextAi}>{msg.content}</Text>
                    </BreathingBubble>
                  ) : (
                    <View style={[styles.bubble, styles.bubbleUser]}>
                      <Text style={styles.msgTextUser}>{msg.content}</Text>
                    </View>
                  )}

                  {/* Meal Card Attachment */}
                  {msg.type === 'meal-card' && msg.mealData && (
                    <View style={styles.cardAttachment}>
                      <Image source={{ uri: msg.mealData.image }} style={styles.cardImage} />
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>{msg.mealData.title}</Text>
                        <Text style={styles.cardMeta}>{msg.mealData.calories} kcal • {msg.mealData.protein} Protein</Text>
                        <Text style={styles.cardTime}>⏱ {msg.mealData.time}</Text>
                        <TouchableOpacity style={styles.cardButton} onPress={() => { }}>
                          <Text style={styles.cardButtonText}>View Recipe</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ))}

            {loading && (
              <View style={styles.messageRow}>
                <View style={styles.avatarAi}>
                  <MaterialCommunityIcons name="robot" size={20} color={theme.primary} />
                </View>
                <BreathingBubble>
                  <TypingIndicator />
                </BreathingBubble>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputArea}>
          {/* Quick Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
            {[
              'Suggest a high protein dinner',
              'Plan a workout',
              'How is my water intake?',
              'Give me motivation'
            ].map((chip, i) => (
              <TouchableOpacity key={i} style={styles.chip} onPress={() => handleSendMessage(chip)}>
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask your coach anything..."
              placeholderTextColor={theme.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
              onPress={() => handleSendMessage()}
              disabled={!input.trim()}
            >
              <MaterialCommunityIcons name="arrow-up" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: theme.bg,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: theme.border
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: theme.textMain },
  headerSubtitle: { fontSize: 13, color: theme.textSub, marginTop: 2 },

  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#dcfce7' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.success },
  onlineText: { fontSize: 12, fontWeight: '600', color: theme.success },

  scrollContent: { paddingBottom: 20 },

  // Stats
  statsContainer: { margin: 20, padding: 20, backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOpacity: 0.02, elevation: 2 },
  statsTitle: { fontSize: 13, fontWeight: '700', color: theme.textSub, textTransform: 'uppercase', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '800', color: theme.textMain },
  statLabel: { fontSize: 11, color: theme.textSub, marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: theme.border },

  // Chat
  chatArea: { paddingHorizontal: 20 },
  dateDivider: { textAlign: 'center', color: theme.textTertiary, fontSize: 12, marginBottom: 20, marginTop: 10 },

  messageRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  messageRowUser: { flexDirection: 'row-reverse' },
  messageRowAi: { justifyContent: 'flex-start' },

  avatarAi: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  senderName: { fontSize: 11, color: theme.textSub, marginBottom: 4, marginLeft: 2 },

  bubble: { padding: 16, borderRadius: 18, maxWidth: '100%' },

  // Note: bubbleAi styles are mainly handled by the BreathingBubble component now, only keeping basic layout here if needed, but handled inline style merging
  bubbleAi: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 4,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    // opacity/radius handled by animation
    elevation: 6,
    padding: 16,
    borderRadius: 18,
    maxWidth: '100%'
  },

  bubbleUser: { backgroundColor: theme.primary, borderTopRightRadius: 4 },

  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextAi: { color: theme.textMain, fontSize: 15, lineHeight: 22 },
  msgTextUser: { color: 'white', fontSize: 15, lineHeight: 22 },

  // Card Attachment
  cardAttachment: { marginTop: 12, backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  cardImage: { width: '100%', height: 140, resizeMode: 'cover' },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.textMain, marginBottom: 4 },
  cardMeta: { fontSize: 13, color: theme.textSub, marginBottom: 8 },
  cardTime: { fontSize: 12, color: theme.textTertiary, fontStyle: 'italic', marginBottom: 12 },
  cardButton: { paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border },
  cardButtonText: { fontSize: 13, fontWeight: '600', color: theme.textMain },

  // Input
  inputArea: { backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border, paddingBottom: 24 },
  chipsContainer: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  chipText: { fontSize: 13, color: theme.textSub },

  inputRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: theme.surface, borderRadius: 24, padding: 8, borderWidth: 1, borderColor: theme.border, gap: 8 },
  input: { flex: 1, fontSize: 15, color: theme.textMain, paddingHorizontal: 12, maxHeight: 100 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: theme.border },
});
