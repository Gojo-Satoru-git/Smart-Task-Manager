import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const CalendarScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Schedule</Text>
      <Text style={styles.placeholderText}>
        Coming Soon: A full calendar view showing tasks automatically scheduled
        by your Reinforcement Learning model.
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
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
});