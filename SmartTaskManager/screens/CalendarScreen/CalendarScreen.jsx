import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import getFont from './../../styles/theme'
import { URL } from '../../ip';

const API_URL = URL.nitin; // Replace with your IP

// --- Helper to format the schedule ---
const ScheduledTask = ({ item }) => {
  // 'item' is now the task object itself
  
  // Format the date
  const date = new Date(item.scheduled_time);
  const dateString = date.toLocaleDateString(undefined, {
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
  });

  return (
    <View style={styles.taskItem}>
      <Text style={styles.taskText}>{item.task_name}</Text>
      <Text style={styles.taskTime}>{dateString}</Text>
    </View>
  );
};

export const CalendarScreen = () => {
  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Fetch the schedule ---
  const fetchSchedule = async () => {
    console.log('Fetching smart schedule...');
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/smart-schedule`);
      const data = await response.json();
      if (response.ok) {
        setSchedule(data);
      } else {
        setError(data.error || 'Failed to fetch schedule');
      }
    } catch (e) {
      console.error(e);
      setError('Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  // useFocusEffect runs every time the user visits this tab
  useFocusEffect(
    useCallback(() => {
      fetchSchedule();
    }, [])
  );

  // --- Render logic ---
  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color="#007AFF" />;
    }
    if (error) {
      return <Text style={styles.errorText}>Error: {error}</Text>;
    }
    if (schedule.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>No pending tasks to schedule!</Text>
          <Text style={styles.subText}>Add some tasks in the 'Tasks' tab.</Text>
        </View>
      );
    }
    return (
      <View>
        {schedule.map(item => (
         <ScheduledTask key={item.id} item={item} />
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="calendar-outline" size={40} color="#007AFF" />
        <Text style={styles.title}>Your Smart Schedule</Text>
      </View>
      {renderContent()}
    </ScrollView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fe',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  title: {
    ...getFont('bold',20),
    // FONT
    fontWeight: 'bold',
    color: '#000',
    marginTop: 12,
  },
  centered: {
    marginTop: 50,
    alignItems: 'center',
  },
  errorText: {
    ...getFont('medium', 18), // FONT
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
  },
  subText: {
    ...getFont('regular', 14), // FONT
    fontWeight: '400',
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  taskItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskText: {
    ...getFont('semibold', 16), // FONT
    fontWeight: '600',
    color: '#333',
  },
  taskTime: {
    ...getFont('medium', 14), // FONT
    fontWeight: '500',
    color: '#007AFF',
    marginTop: 6,
  },
});