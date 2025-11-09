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
import { URL } from '../../ip'; // Adjust path
import FeedbackModal from './feedbackmodal'

const API_URL = URL.barath;

// --- TaskItem component ---
const TaskItem = ({
  task,
  navigation,
  onComplete,
  onToggleMyDay,
  onDelete,
}) => {
  const isCompleted = task.status === 'completed';
  const isOnMyDay = task.my_day_date ? true : false;

  const handleComplete = () => {
    if (!isCompleted) onComplete(task.id);
  };

  const handleToggleMyDay = () => {
    if (!isCompleted) onToggleMyDay(task);
  };

  const handlePress = () => {
    navigation.navigate('TaskDetail', { taskId: task.id });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.task_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(task.id),
        },
      ],
    );
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

      {/* "My Day" Button */}
      {!isCompleted && (
        <TouchableOpacity style={styles.iconButton} onPress={handleToggleMyDay}>
          <Icon
            name={isOnMyDay ? 'sunny' : 'sunny-outline'}
            size={22}
            color={isOnMyDay ? '#007AFF' : '#555'}
          />
        </TouchableOpacity>
      )}

      {/* Delete Button */}
      <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
        <Icon
          name="trash-outline"
          size={22}
          color={isCompleted ? '#aaa' : '#E53E3E'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// --- TaskSection component ---
const TaskSection = ({
  title,
  tasks,
  navigation,
  onComplete,
  onToggleMyDay,
  onDelete, // Added
}) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {tasks.map(task => (
      <TaskItem
        key={task.id}
        task={task}
        navigation={navigation}
        onComplete={onComplete}
        onToggleMyDay={onToggleMyDay}
        onDelete={onDelete} // Pass delete handler
      />
    ))}
  </View>
);

// --- MAIN SCREEN COMPONENT ---
export const TaskListScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [myDayTasks, setMyDayTasks] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
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

  // --- UPDATED: Handle Completing a task (shows custom modal) ---
  const handleCompleteTask = async taskId => {
    // 1. Find the task to complete
    let task =
      myDayTasks.find(t => t.id === taskId) ||
      pendingTasks.find(t => t.id === taskId);

    if (task) {
      // 2. Set the task in state and show the modal
      setTaskToComplete(task);
      setModalVisible(true);
    }
  };

  // --- NEW: This function is called by the modal ---
  const completeTaskOnServer = async actualTime => {
    if (!taskToComplete) return; // Safety check

    const taskId = taskToComplete.id;
    const listType = myDayTasks.find(t => t.id === taskId)
      ? 'my_day'
      : 'pending';

    // 3. Hide the modal
    setModalVisible(false);

    // 4. Optimistic UI: Move task immediately
    if (listType === 'my_day') {
      setMyDayTasks(prev => prev.filter(task => task.id !== taskId));
    } else {
      setPendingTasks(prev => prev.filter(task => task.id !== taskId));
    }
    setCompletedTasks(prev => [
      { ...taskToComplete, status: 'completed' },
      ...prev,
    ]);

    // 5. Tell the server
    try {
      const response = await fetch(
        `${API_URL}/api/v1/tasks/${taskId}/complete`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actual_time_min: actualTime }),
        },
      );
      if (!response.ok) throw new Error('Failed to complete task on server');
    } catch (e) {
      // Roll back on failure
      Alert.alert('Error', 'Could not complete the task.');
      setCompletedTasks(prev => prev.filter(task => task.id !== taskId));
      if (listType === 'my_day') {
        setMyDayTasks(prev => [taskToComplete, ...prev]);
      } else {
        setPendingTasks(prev => [taskToComplete, ...prev]);
      }
    } finally {
      setTaskToComplete(null); // Clear the task
    }
  };

  const handleToggleMyDay = async task => {
    const today = new Date().toISOString().split('T')[0];
    let originalList;
    if (myDayTasks.find(t => t.id === task.id)) {
      originalList = 'my_day';
      setMyDayTasks(prev => prev.filter(t => t.id !== task.id));
      setPendingTasks(prev => [{ ...task, my_day_date: null }, ...prev]);
    } else {
      originalList = 'pending';
      setPendingTasks(prev => prev.filter(t => t.id !== task.id));
      setMyDayTasks(prev => [{ ...task, my_day_date: today }, ...prev]);
    }
    try {
      await fetch(`${API_URL}/api/v1/tasks/${task.id}/myday`, {
        method: 'POST',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not update "My Day".');
      if (originalList === 'my_day') {
        setPendingTasks(prev => prev.filter(t => t.id !== task.id));
        setMyDayTasks(prev => [task, ...prev]);
      } else {
        setMyDayTasks(prev => prev.filter(t => t.id !== task.id));
        setPendingTasks(prev => [task, ...prev]);
      }
    }
  };

  const handleDeleteTask = async taskId => {
    let originalList;
    let taskToDelete;
    if (myDayTasks.find(t => t.id === taskId)) {
      originalList = 'my_day';
      taskToDelete = myDayTasks.find(t => t.id === taskId);
      setMyDayTasks(prev => prev.filter(t => t.id !== taskId));
    } else if (pendingTasks.find(t => t.id === taskId)) {
      originalList = 'pending';
      taskToDelete = pendingTasks.find(t => t.id === taskId);
      setPendingTasks(prev => prev.filter(t => t.id !== taskId));
    } else {
      originalList = 'completed';
      taskToDelete = completedTasks.find(t => t.id === taskId);
      setCompletedTasks(prev => prev.filter(t => t.id !== taskId));
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete task');
    } catch (e) {
      Alert.alert('Error', 'Could not delete the task.');
      if (originalList === 'my_day')
        setMyDayTasks(prev => [taskToDelete, ...prev]);
      else if (originalList === 'pending')
        setPendingTasks(prev => [taskToDelete, ...prev]);
      else setCompletedTasks(prev => [taskToDelete, ...prev]);
    }
  };

  const priorityTasks = pendingTasks.filter(
    t => t.predicted_priority === 'High' || t.predicted_priority === 'Critical',
  );
  const otherTasks = pendingTasks.filter(
    t => t.predicted_priority !== 'High' && t.predicted_priority !== 'Critical',
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
        {myDayTasks.length > 0 && (
          <TaskSection
            title="☀️ My Day"
            tasks={myDayTasks}
            navigation={navigation}
            onComplete={handleCompleteTask}
            onToggleMyDay={handleToggleMyDay}
            onDelete={handleDeleteTask}
          />
        )}
        {priorityTasks.length > 0 && (
          <TaskSection
            title="✨ Smart Priority"
            tasks={priorityTasks}
            navigation={navigation}
            onComplete={handleCompleteTask}
            onToggleMyDay={handleToggleMyDay}
            onDelete={handleDeleteTask}
          />
        )}
        {otherTasks.length > 0 && (
          <TaskSection
            title="Other Tasks"
            tasks={otherTasks}
            navigation={navigation}
            onComplete={handleCompleteTask}
            onToggleMyDay={handleToggleMyDay}
            onDelete={handleDeleteTask}
          />
        )}
        {completedTasks.length > 0 && (
          <TaskSection
            title="Recently Completed"
            tasks={completedTasks}
            navigation={navigation}
            onComplete={() => {}}
            onToggleMyDay={() => {}}
            onDelete={handleDeleteTask}
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
      {taskToComplete && (
        <FeedbackModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setTaskToComplete(null);
          }}
          onSubmit={completeTaskOnServer}
          predictedTime={taskToComplete.predicted_time_min || 30}
        />
      )}
    </View>
  );
};

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
  taskText: { ...getFont('medium', 16), fontWeight: '500', color: '#333' },
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
  taskItemCompleted: { backgroundColor: '#f9f9f9', opacity: 0.7 },
  taskTextCompleted: {
    ...getFont('medium', 16),
    fontWeight: '500',
    textDecorationLine: 'line-through',
    color: '#888',
  },
  taskCheckboxCompleted: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  iconButton: { padding: 4, marginLeft: 8 },
});
