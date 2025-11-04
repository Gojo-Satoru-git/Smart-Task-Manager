import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
// --- Mock Data ---
const smartPriorityTasks = [
  { id: '1', title: 'Finish ML model for time prediction' },
  { id: '2', title: 'Submit OS assignment' },
];

const todayTasks = [
  { id: '3', title: 'Grocery shopping' },
  { id: '4', title: 'Call back mom' },
  { id: '5', title: 'Team meeting at 4 PM' },
];
// --- End Mock Data ---

// A reusable component for task items
// --- UPDATED: Now accepts 'navigation' and 'taskId' props and is tappable ---
const TaskItem = ({ title, navigation, taskId }) => (
  <TouchableOpacity
    style={styles.taskItem}
    onPress={() => navigation.navigate('TaskDetail', { taskId: taskId })}
  >
    <TouchableOpacity style={styles.taskCheckbox} />
    <Text style={styles.taskText}>{title}</Text>
  </TouchableOpacity>
);

// A reusable component for list sections
// --- UPDATED: Now accepts 'navigation' prop to pass it down ---
const TaskSection = ({ title, tasks, navigation }) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {tasks.map(task => (
      <TaskItem
        key={task.id}
        title={task.title}
        taskId={task.id} // <-- ADDED
        navigation={navigation} // <-- ADDED
      />
    ))}
  </View>
);

export const TaskListScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* --- UPDATED: Pass the 'navigation' prop down --- */}
        <TaskSection
          title="✨ Smart Priority"
          tasks={smartPriorityTasks}
          navigation={navigation} 
        />
        <TaskSection
          title="Today"
          tasks={todayTasks}
          navigation={navigation}
        />
      </ScrollView>

      {/* Floating Action Button (FAB) to Add Task */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTaskModal')}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// --- Styles (No changes) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fe', 
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
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
  },
  taskText: {
    fontSize: 16,
    color: '#333',
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
});