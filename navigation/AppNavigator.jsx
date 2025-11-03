import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

// --- Import all your screens ---
// Make sure the path '../screens/' matches your project structure.
// Import your screens
import { TaskListScreen } from '../screens/TaskListScreen/TaskListScreen';
import { TaskDetailScreen } from '../screens/TaskDetailsScreen/TaskDetailsScreen';
import { CalendarScreen } from '../screens/CalendarScreen/CalendarScreen';
import { InsightsScreen } from '../screens/InsigtsScreen/InsightsScreen';
import { SettingsScreen } from '../screens/SettingsScreen/SettingsScreen';
import { AddTaskModalScreen } from '../screens/TaskModalScreen/TaskModalScreen';

// --- Create the navigator instances ---
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- 1. Define each Tab's Stack Navigator ---
// These are defined as separate, top-level components to optimize performance.

/**
 * Stack navigator for the "Tasks" tab, including
 * TaskList and TaskDetail screens.
 */
const TasksStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="TaskList" 
        component={TaskListScreen} 
        options={{ title: 'My Tasks' }} 
      />
      <Stack.Screen 
        name="TaskDetail" 
        component={TaskDetailScreen} 
        options={{ title: 'Task Details' }}
      />
    </Stack.Navigator>
  );
};

/**
 * Stack navigator for the "Calendar" tab.
 */
const CalendarStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Calendar" 
        component={CalendarScreen} 
        options={{ title: 'Schedule' }} 
      />
    </Stack.Navigator>
  );
};

/**
 * Stack navigator for the "Insights" tab.
 */
const InsightsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Insights" 
        component={InsightsScreen} 
        options={{ title: 'Productivity' }} 
      />
    </Stack.Navigator>
  );
};

/**
 * Stack navigator for the "Settings" tab.
 */
const SettingsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Settings' }} 
      />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Tasks') {
            iconName = focused ? 'checkmark-done-circle' : 'checkmark-done-circle-outline';
          } else if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Insights') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF', // Example active color
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Tasks" component={TasksStack} />
      <Tab.Screen name="Calendar" component={CalendarStack} />
      <Tab.Screen name="Insights" component={InsightsStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
};

// --- 3. Define the Root Stack (App's main navigator) ---
/**
 * The Root Navigator wraps the main app (MainTabs) and
 * adds any modal screens that should appear over the *entire* app.
 */
export const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide header for the root stack
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="AddTaskModal"
        component={AddTaskModalScreen}
        options={{ presentation: 'modal' }} // This makes it slide up
      />
      {/* You can add EditTaskModal here later */}
    </Stack.Navigator>
  );
};