import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { URL } from '../../ip';
// 1. Import your font helper (adjust path if needed)
import theme from '../../styles/theme';

// 2. Define your API URL
const API_URL = URL.barath; 

export const TaskDetailScreen = ({ route }) => {
  // --- Get the task ID passed from TaskListScreen ---
  const { taskId } = route.params;

  // 3. Add state for loading and task data
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 4. Add useEffect to fetch data when the screen loads
  useEffect(() => {
    const fetchTaskDetails = async () => {
      console.log(`Fetching details for task ID: ${taskId}`);
      try {
        const response = await fetch(`${API_URL}/api/v1/tasks/${taskId}`);
        const data = await response.json();
        
        if (response.ok) {
          setTask(data);
        } else {
          setError(data.error || 'Failed to fetch task');
          Alert.alert('Error', data.error || 'Failed to fetch task');
        }
      } catch (e) {
        setError('Could not connect to server.');
        Alert.alert('Error', 'Could not connect to server.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTaskDetails();
  }, [taskId]); // Re-run this effect if the taskId ever changes

  // 5. Helper function to style priority
  const getPriorityStyle = (priority) => {
    if (priority === 'Critical') {
      return { color: '#E53E3E', text: `🔴 ${priority}` };
    }
    if (priority === 'High') {
      return { color: '#DD6B20', text: `🔥 ${priority}` };
    }
    if (priority === 'Medium') {
      return { color: '#D69E2E', text: `🔶 ${priority}` };
    }
    return { color: '#3182CE', text: `🔵 ${priority || 'Low'}` };
  };

  // 6. Render loading and error states
  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }
  if (error || !task) {
    return <Text style={styles.errorText}>{error || 'Task not found'}</Text>;
  }

  // 7. Render the real task data
  const priorityStyle = getPriorityStyle(task.predicted_priority);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{task.task_name}</Text>
      <Text style={styles.subText}>Status: {task.status}</Text>
      
      <View style={styles.detailBox}>
        <Text style={styles.label}>ML Predicted Time:</Text>
        <Text style={styles.value}>
          {task.predicted_time_min ? `~ ${task.predicted_time_min} min` : 'N/A'}
        </Text>
      </View>
      
      <View style={styles.detailBox}>
        <Text style={styles.label}>ML Predicted Priority:</Text>
        <Text style={[styles.value, { color: priorityStyle.color }]}>
          {priorityStyle.text}
        </Text>
      </View>
      
      <View style={styles.detailBox}>
        <Text style={styles.label}>Due Date:</Text>
        <Text style={styles.value}>
          {task.due_date ? new Date(task.due_date).toLocaleString() : 'No date set'}
        </Text>
      </View>

      <View style={styles.detailBox}>
        <Text style={styles.label}>Scheduled For (by RL Agent):</Text>
        <Text style={styles.value}>
          {task.scheduled_time ? new Date(task.scheduled_time).toLocaleString() : 'Not scheduled yet'}
        </Text>
      </View>
      
      <View style={styles.detailBox}>
        <Text style={styles.label}>Created:</Text>
        <Text style={styles.value}>
          {new Date(task.created_at).toLocaleString()}
        </Text>
      </View>
      
      {task.completed_at && (
        <View style={styles.detailBox}>
          <Text style={styles.label}>Completed:</Text>
          <Text style={styles.value}>
            {new Date(task.completed_at).toLocaleString()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// 8. Updated styles with fonts
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...getFont('medium', 16),
    fontWeight: '500',
    color: 'red',
    textAlign: 'center',
    marginTop: 50,
  },
  title: {
    ...getFont('bold', 24),
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subText: {
    ...getFont('regular', 16),
    fontWeight: '400',
    color: '#555',
    marginBottom: 24,
    textTransform: 'capitalize',
  },
  detailBox: {
    backgroundColor: '#f4f7fe',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    ...getFont('regular', 14),
    fontWeight: '400',
    color: '#555',
    marginBottom: 4,
  },
  value: {
    ...getFont('medium', 16),
    fontWeight: '500',
    color: '#000',
  },
});