import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export const TaskDetailScreen = ({ route }) => {
  // --- Get the task ID passed from TaskListScreen ---
  const { taskId } = route.params;

  // In a real app, you'd use this ID to fetch the full task details
  // from your state or database. We'll just display it for now.

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Task Details</Text>
      <Text style={styles.subText}>You are viewing details for Task ID: {taskId}</Text>
      
      <View style={styles.detailBox}>
        <Text style={styles.label}>ML Predicted Time:</Text>
        <Text style={styles.value}>~ 1 hr 30 min (Placeholder)</Text>
      </View>
      
      <View style={styles.detailBox}>
        <Text style={styles.label}>ML Predicted Priority:</Text>
        <Text style={styles.value}>🔴 High (Placeholder)</Text>
      </View>

      <View style={styles.detailBox}>
        <Text style={styles.label}>Notes:</Text>
        <Text style={styles.value}>This is a placeholder for task notes or subtasks.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
  },
  detailBox: {
    backgroundColor: '#f4f7fe',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
});