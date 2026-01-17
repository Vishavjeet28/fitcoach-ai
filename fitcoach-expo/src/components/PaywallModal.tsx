import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface PaywallModalProps {
    visible: boolean;
    onClose: () => void;
}

const colors = {
    primary: '#13ec80',
    backgroundDark: '#102219',
    surfaceDark: '#16261f',
    textPrimary: '#ffffff',
    textSecondary: '#9CA3AF'
};

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose }) => {
    const navigation = useNavigation<any>();

    const handleUpgrade = () => {
        onClose();
        navigation.navigate('Pricing');
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Fallback for blur if needed, although BlurView handles it */}
                <View style={styles.blurBackdrop} /> 
                
                <View style={styles.card}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="lock-alert" size={48} color={colors.primary} />
                    </View>

                    <Text style={styles.title}>Limit Reached</Text>
                    <Text style={styles.message}>
                        You've used all 5 of your free AI coach interactions. 
                        Upgrade to Pro for unlimited access to your personal AI fitness coach.
                    </Text>

                    <TouchableOpacity style={styles.primaryButton} onPress={handleUpgrade}>
                        <Text style={styles.primaryButtonText}>View Upgrade Options</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                        <Text style={styles.secondaryButtonText}>Maybe Later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    blurBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    card: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: colors.surfaceDark,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.51,
        shadowRadius: 13.16,
        elevation: 20,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 8,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(19, 236, 128, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        color: colors.backgroundDark,
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryButton: {
        paddingVertical: 12,
    },
    secondaryButtonText: {
        color: colors.textSecondary,
        fontSize: 14,
    }
});
