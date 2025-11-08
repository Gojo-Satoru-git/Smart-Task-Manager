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
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
// Import your font helper
import { SafeAreaView } from 'react-native-safe-area-context';
import { URL } from '../../ip';
// --- (Make sure this IP is correct) ---
const API_URL = URL.nitin;

// --- UPDATED TaskItem component ---
const TaskItem = ({ task, navigation, onComplete, onToggleMyDay }) => {
  const isCompleted = task.status === 'completed';

  // Check if the task is on "My Day"
  const isOnMyDay = task.my_day_date ? true : false;

  const handleComplete = () => {
    if (!isCompleted) onComplete(task.id);
  };

  const handleToggleMyDay = () => {
    if (!isCompleted) onToggleMyDay(task); // Pass the whole task
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

      {/* Task Text */}
      <View style={styles.taskTextContainer}>
        <Text
          style={[styles.taskText, isCompleted && styles.taskTextCompleted]}
        >
          {task.task_name}
        </Text>
        {!isCompleted && task.predicted_time_min && (
          <Text style={styles.taskSubText}>
            Est: {task.predicted_time_min} min
          </Text>
        )}
      </View>

      {/* --- NEW "My Day" Button --- */}
      {!isCompleted && (
        <TouchableOpacity
          style={styles.myDayButton}
          onPress={handleToggleMyDay}
        >
          <Icon
            name={isOnMyDay ? 'sunny' : 'sunny-outline'}
            size={22}
            color={isOnMyDay ? '#007AFF' : '#555'}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// --- TaskSection component (Updated) ---
// Now passes 'onToggleMyDay'
const TaskSection = ({
  title,
  tasks,
  navigation,
  onComplete,
  onToggleMyDay,
}) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {tasks.map(task => (
      <TaskItem
        key={task.id}
        task={task}
        navigation={navigation}
        onComplete={onComplete}
        onToggleMyDay={onToggleMyDay} // Pass the function down
      />
    ))}
  </View>
);

// --- MAIN SCREEN COMPONENT ---
export const TaskListScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  // --- NEW: State for all three lists ---
  const [myDayTasks, setMyDayTasks] = useState([]);
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
      // --- NEW: Set all three lists from the server's response ---
      setMyDayTasks(data.my_day || []);
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

  // --- Handle Completing a task ---
  const handleCompleteTask = async taskId => {
    // Find where the task is (My Day or Pending)
    let taskToComplete = myDayTasks.find(task => task.id === taskId);
    let listType = 'my_day';

    if (!taskToComplete) {
      taskToComplete = pendingTasks.find(task => task.id === taskId);
      listType = 'pending';
    }

    if (!taskToComplete) return;

    // Optimistic UI: Move task immediately
    if (listType === 'my_day') {
      setMyDayTasks(prev => prev.filter(task => task.id !== taskId));
    } else {
      setPendingTasks(prev => prev.filter(task => task.id !== taskId));
    }
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
        // Roll back on failure
        Alert.alert('Error', 'Could not complete the task.');
        setCompletedTasks(prev => prev.filter(task => task.id !== taskId));
        if (listType === 'my_day') {
          setMyDayTasks(prev => [taskToComplete, ...prev]);
        } else {
          setPendingTasks(prev => [taskToComplete, ...prev]);
        }
      }
    } catch (e) {
      // Roll back on failure
      Alert.alert('Error', 'Could not complete the task.');
      setCompletedTasks(prev => prev.filter(task => task.id !== taskId));
      if (listType === 'my_day') {
        setMyDayTasks(prev => [taskToComplete, ...prev]);
      } else {
        setPendingTasks(prev => [taskToComplete, ...prev]);
      }
    }
  };

  // --- NEW: Handle Toggling "My Day" ---
  const handleToggleMyDay = async task => {
    let originalList;
    let targetList;

    // Get today's date as a simple YYYY-MM-DD string for the optimistic update
    const today = new Date().toISOString().split('T')[0];

    // Is it currently in "My Day"?
    if (myDayTasks.find(t => t.id === task.id)) {
      originalList = 'my_day';
      targetList = 'pending';

      // Optimistic UI: Move from My Day to Pending
      setMyDayTasks(prev => prev.filter(t => t.id !== task.id));

      // --- FIX: Create a new object with 'my_day_date' set to null ---
      setPendingTasks(prev => [{ ...task, my_day_date: null }, ...prev]);
    } else {
      originalList = 'pending';
      targetList = 'my_day';

      // Optimistic UI: Move from Pending to My Day
      setPendingTasks(prev => prev.filter(t => t.id !== task.id));

      // --- FIX: Create a new object with a truthy 'my_day_date' ---
      setMyDayTasks(prev => [{ ...task, my_day_date: today }, ...prev]);
    }

    // Call the server
    try {
      await fetch(`${API_URL}/api/v1/tasks/${task.id}/myday`, {
        method: 'POST',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not update "My Day".');
      // Roll back on failure
      if (originalList === 'my_day') {
        setPendingTasks(prev => prev.filter(t => t.id !== task.id));
        setMyDayTasks(prev => [task, ...prev]);
      } else {
        setMyDayTasks(prev => prev.filter(t => t.id !== task.id));
        setPendingTasks(prev => [task, ...prev]);
      }
    }
  };

  // --- Splitting logic for "Pending" tasks ---
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
    if (
      isLoading &&
      myDayTasks.length === 0 &&
      pendingTasks.length === 0 &&
      completedTasks.length === 0
    ) {
      return <ActivityIndicator size="large" style={styles.centered} />;
    }
    if (error) {
      return <Text style={styles.centered}>Error: {error}</Text>;
    }
    if (
      myDayTasks.length === 0 &&
      pendingTasks.length === 0 &&
      completedTasks.length === 0
    ) {
      return <Text style={styles.centered}>No tasks found. Add one!</Text>;
    }

    return (
      <ScrollView>
        {/* --- NEW: "My Day" Section --- */}
        {myDayTasks.length > 0 && (
          <TaskSection
            title="☀️ My Day"
            tasks={myDayTasks}
            navigation={navigation}
            onComplete={handleCompleteTask}
            onToggleMyDay={handleToggleMyDay}
          />
        )}

        {priorityTasks.length > 0 && (
          <TaskSection
            title="✨ Smart Priority"
            tasks={priorityTasks}
            navigation={navigation}
            onComplete={handleCompleteTask}
            onToggleMyDay={handleToggleMyDay}
          />
        )}

        {otherTasks.length > 0 && (
          <TaskSection
            title="Other Tasks"
            tasks={otherTasks}
            navigation={navigation}
            onComplete={handleCompleteTask}
            onToggleMyDay={handleToggleMyDay}
          />
        )}

        {completedTasks.length > 0 && (
          <TaskSection
            title="Recently Completed"
            tasks={completedTasks}
            navigation={navigation}
            onComplete={() => {}}
            onToggleMyDay={() => {}}
          />
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTaskModal')}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

// --- Styles (Updated with fonts and new button) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fe' },
  centered: {
    ...getFont('medium', 16),
    fontWeight: '500',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    color: '#555',
  },
  sectionContainer: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    ...getFont('bold', 20),
    fontWeight: 'bold',
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
  taskTextContainer: { flex: 1, marginRight: 10 },
  taskText: {
    ...getFont('medium', 16),
    fontWeight: '500',
    color: '#333',
  },
  taskSubText: {
    ...getFont('regular', 12),
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

  taskItemCompleted: {
    backgroundColor: '#f9f9f9',
    opacity: 0.7,
  },
  taskTextCompleted: {
    ...getFont('medium', 16),
    fontWeight: '500',
    textDecorationLine: 'line-through',
    color: '#888',
  },
  taskCheckboxCompleted: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  // --- NEW STYLE ---
  myDayButton: {
    padding: 4,
  },
});
