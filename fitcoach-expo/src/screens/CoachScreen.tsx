import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AIService from '../services/aiService';
import { useAuth } from '../context/AuthContext';

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
};

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

export default function CoachScreen() {
  const { isLoading, isAuthenticated } = useAuth();
  const isAuthReady = !isLoading;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSendMessage = async () => {
    // Don't send while auth is still restoring.
    if (!input.trim() || loading || !isAuthReady) return;

    // AI endpoints are auth protected. If user is not authenticated, show a friendly message.
    if (!isAuthenticated) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Please sign in to use AI Coach.',
        },
      ]);
      return;
    }

    const userMessage = input.trim();
    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Convert messages to format expected by AI service
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      chatHistory.push({ role: 'user', content: userMessage });

      // Get AI response
      const aiResponse = await AIService.chatWithHistory(chatHistory);

      const aiMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiResponse,
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedPrompts = (): Array<{ icon: any; text: string; prompt: string }> => [
    { icon: 'food-apple', text: 'What should I eat for breakfast?', prompt: 'What should I eat for a healthy breakfast?' },
    { icon: 'dumbbell', text: 'Create a workout plan', prompt: 'Create a beginner workout plan for weight loss' },
    { icon: 'water', text: 'Hydration tips', prompt: 'Give me tips to drink more water daily' },
    { icon: 'chart-line', text: 'Analyze my diet', prompt: 'How can I improve my daily diet?' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="robot-excited" size={28} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Coach</Text>
            <Text style={styles.headerSubtitle}>Powered by FitCoach AI</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {/* Date Badge */}
        <View style={styles.dateBadgeContainer}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>Today</Text>
          </View>
        </View>

        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="robot" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Start a conversation with your AI Coach</Text>
            <Text style={styles.emptySubtitle}>
              Ask me anything about fitness, nutrition, or healthy living!
            </Text>

            {!isAuthReady && (
              <Text style={[styles.emptySubtitle, { marginTop: 8, color: colors.warning }]}> 
                Getting your session ready…
              </Text>
            )}

            {/* Suggested Prompts */}
            <View style={styles.suggestedPromptsContainer}>
              <Text style={styles.suggestedPromptsTitle}>Suggested Questions:</Text>
              {getSuggestedPrompts().map((prompt, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestedPromptCard}
                  onPress={() => setInput(prompt.prompt)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name={prompt.icon} size={20} color={colors.primary} />
                  <Text style={styles.suggestedPromptText}>{prompt.text}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.role === 'user' ? styles.userMessageContainer : styles.assistantMessageContainer,
              ]}
            >
              {message.role === 'assistant' && (
                <View style={styles.assistantAvatar}>
                  <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userText : styles.assistantText,
                ]}>
                  {message.content}
                </Text>
              </View>
              {message.role === 'user' && (
                <View style={styles.userAvatar}>
                  <MaterialCommunityIcons name="account" size={20} color="white" />
                </View>
              )}
            </View>
          ))
        )}

        {loading && (
          <View style={styles.loadingMessageContainer}>
            <View style={styles.assistantAvatar}>
              <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
            </View>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || loading || !isAuthReady) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!input.trim() || loading || !isAuthReady}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={input.trim() && !loading && isAuthReady ? [colors.primary, colors.primaryDark] : ['#374151', '#1F2937']}
              style={styles.sendButtonGradient}
            >
              <MaterialCommunityIcons 
                name="send" 
                size={20} 
                color={input.trim() && !loading && isAuthReady ? 'white' : colors.textTertiary} 
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 100,
  },
  dateBadgeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dateBadge: {
    backgroundColor: colors.surfaceDark,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  dateBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  suggestedPromptsContainer: {
    width: '100%',
    marginTop: 16,
  },
  suggestedPromptsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  suggestedPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestedPromptText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.surfaceDark,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: colors.textPrimary,
  },
  loadingMessageContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceDark,
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceDark,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
