import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export const InsightsScreen = () => {
  return (
    <View style={styles.container}>
      <Icon name="stats-chart-outline" size={60} color="#007AFF" />
      <Text style={styles.title}>Productivity Insights</Text>
      <Text style={styles.placeholderText}>
        Coming Soon: ML-powered charts (Clustering) to show when you're most
        productive and suggestions for improvement.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7fe',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
});