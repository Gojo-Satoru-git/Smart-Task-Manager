import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import getFont from './../../styles/theme';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://10.209.2.40:5000'; // Replace with your IP

// --- TaskItem component ---
// We'll add a 'status' prop to change its style
const TaskItem = ({ task, navigation, onComplete }) => {
  const isCompleted = task.status === 'completed';

  const handleComplete = () => {
    // Only allow completing if it's pending
    if (!isCompleted) {
      onComplete(task.id);
    }
  };

  const handlePress = () => {
    navigation.navigate('TaskDetail', { taskId: task.id });
  };

  return (
    <TouchableOpacity
      style={[styles.taskItem, isCompleted && styles.taskItemCompleted]}
      onPress={handlePress}
    >
      {/* Checkbox */}
      <TouchableOpacity
        style={[
          styles.taskCheckbox,
          isCompleted && styles.taskCheckboxCompleted,
        ]}
        onPress={handleComplete}
      >
        {isCompleted && <Icon name="checkmark" size={16} color="#fff" />}
      </TouchableOpacity>

      <View style={styles.taskTextContainer}>
        <Text
          style={[styles.taskText, isCompleted && styles.taskTextCompleted]}
        >
          {task.task_name}
        </Text>
        {/* Show predicted time only if pending */}
        {!isCompleted && task.predicted_time_min && (
          <Text style={styles.taskSubText}>
            Est: {task.predicted_time_min} min
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// --- TaskSection component (No changes) ---
const TaskSection = ({ title, tasks, navigation, onComplete }) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {tasks.map(task => (
      <TaskItem
        key={task.id}
        task={task}
        navigation={navigation}
        onComplete={onComplete}
      />
    ))}
  </View>
);

export const TaskListScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  // --- NEW: State for both lists ---
  const [pendingTasks, setPendingTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');

      const data = await response.json();
      // --- NEW: Set both lists from the server's response ---
      setPendingTasks(data.pending || []);
      setCompletedTasks(data.completed || []);
    } catch (e) {
      setError(e.message);
      Alert.alert('Error', 'Could not load tasks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchTasks();
    }
  }, [isFocused]);

  // --- NEW: Updated complete task logic ---
  const handleCompleteTask = async taskId => {
    // Find the task in our pending list
    const taskToComplete = pendingTasks.find(task => task.id === taskId);
    if (!taskToComplete) return;

    // Optimistic UI: Move task immediately
    setPendingTasks(prev => prev.filter(task => task.id !== taskId));
    setCompletedTasks(prev => [
      { ...taskToComplete, status: 'completed' },
      ...prev,
    ]);

    // Now, tell the server
    try {
      const response = await fetch(
        `${API_URL}/api/v1/tasks/${taskId}/complete`,
        {
          method: 'PUT',
        },
      );
      if (!response.ok) {
        // If server fails, roll back the UI change
        Alert.alert('Error', 'Could not complete the task.');
        setCompletedTasks(prev => prev.filter(task => task.id !== taskId));
        setPendingTasks(prev => [taskToComplete, ...prev]);
      }
      // If server succeeds, we're already done!
    } catch (e) {
      // Also roll back on network error
      Alert.alert('Error', 'Could not complete the task.');
      setCompletedTasks(prev => prev.filter(task => task.id !== taskId));
      setPendingTasks(prev => [taskToComplete, ...prev]);
    }
  };

  // --- Splitting logic (simpler) ---
  const priorityTasks = pendingTasks.filter(
    task =>
      task.predicted_priority === 'High' ||
      task.predicted_priority === 'Critical',
  );
  const otherTasks = pendingTasks.filter(
    task =>
      task.predicted_priority !== 'High' &&
      task.predicted_priority !== 'Critical',
  );

  const renderContent = () => {
    if (isLoading && pendingTasks.length === 0 && completedTasks.length === 0) {
      return <ActivityIndicator size="large" style={styles.centered} />;
    }
    if (error) {
      return <Text style={styles.centered}>Error: {error}</Text>;
    }
    if (pendingTasks.length === 0 && completedTasks.length === 0) {
      return <Text style={styles.centered}>No tasks found. Add one!</Text>;
    }

    return (
      <ScrollView>
        {priorityTasks.length > 0 && (
          <TaskSection
            title="✨ Smart Priority"
            tasks={priorityTasks}
            navigation={navigation}
            onComplete={handleCompleteTask}
          />
        )}
        {otherTasks.length > 0 && (
          <TaskSection
            title="Other Tasks"
            tasks={otherTasks}
            navigation={navigation}
            onComplete={handleCompleteTask}
          />
        )}
        {/* --- NEW: Completed Section --- */}
        {completedTasks.length > 0 && (
          <TaskSection
            title="Recently Completed"
            tasks={completedTasks}
            navigation={navigation}
            onComplete={() => {}} // No action
          />
        )}
      </ScrollView>
    );
  };

  return (
    <>
      {renderContent()}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTaskModal')}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </>
  );
};

// --- Styles (NEW styles added) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fe' },
  centered: {
    ...getFont('medium', 16), // FONT
    fontWeight: '500',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    color: '#555',
  },
  sectionContainer: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    ...getFont('bold', 20), // FONT
    fontWeight: 'bold', // Fallback
    color: '#000',
    marginBottom: 10,
  },
  taskItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTextContainer: { flex: 1 },
  taskText: {
    ...getFont('medium', 16), // FONT
    fontWeight: '500',
    color: '#333',
  },
  taskSubText: {
    ...getFont('regular', 12), // FONT
    fontWeight: '400',
    color: 'gray',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  // --- NEW STYLES ---
  taskItemCompleted: {
    backgroundColor: '#f9f9f9', // Lighter background
    opacity: 0.7,
  },
  taskTextCompleted: {
    ...getFont('medium', 16), // FONT
    fontWeight: '500',
    textDecorationLine: 'line-through',
    color: '#888',
  },
  taskCheckboxCompleted: {
    backgroundColor: '#007AFF', // Filled check
    borderColor: '#007AFF',
  },
});
