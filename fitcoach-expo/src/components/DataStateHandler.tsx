/**
 * Data State Handler Component
 * PRODUCTION HARDENED - Consistent loading, empty, and error states
 * 
 * Usage:
 *   <DataStateHandler
 *     loading={loading}
 *     error={error}
 *     empty={data.length === 0}
 *     emptyMessage="No food logs found"
 *   >
 *     {data.map(item => <Item key={item.id} {...item} />)}
 *   </DataStateHandler>
 */

import React, { ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface DataStateHandlerProps {
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  loadingMessage?: string;
  children: ReactNode;
}

export const DataStateHandler: React.FC<DataStateHandlerProps> = ({
  loading,
  error,
  empty = false,
  emptyMessage = 'No data available',
  emptyIcon = '📭',
  loadingMessage = 'Loading...',
  children,
}) => {
  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  }

  // Empty state
  if (empty) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyIcon}>{emptyIcon}</Text>
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
      </View>
    );
  }

  // Data available - render children
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyMessage: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
});

export default DataStateHandler;
