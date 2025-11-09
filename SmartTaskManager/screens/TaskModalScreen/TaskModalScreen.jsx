import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { debounce } from 'lodash';
import DateTimePicker from '@react-native-community/datetimepicker';
import getFont from './../../styles/theme';
import { URL } from '../../ip';
// --- (Make sure this IP is correct) ---
const API_URL = URL.barath; // e.g., http://192.168.1.5:5000

export const AddTaskModalScreen = ({ navigation }) => {
  const [nlpInput, setNlpInput] = useState('');
  const [taskName, setTaskName] = useState('');
  const [predictedTime, setPredictedTime] = useState(''); // This is a string like "~ 90 min"
  const [predictedPriority, setPredictedPriority] = useState('');

  // ML model outputs (raw)
  const [rawPredictedTime, setRawPredictedTime] = useState(null);

  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hasDate, setHasDate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTaskPredictions = async text => {
    if (text.trim().length === 0) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/parse-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });
      const data = await response.json();

      if (response.ok) {
        setTaskName(data.task_name || '');
        setPredictedPriority(data.predicted_priority || '');

        // Store the raw time for saving
        setRawPredictedTime(data.predicted_time_min);
        setPredictedTime(
          data.predicted_time_min ? `~ ${data.predicted_time_min} min` : '',
        );

        if (data.due_date) {
          setDueDate(new Date(data.due_date));
          setHasDate(true);
        } else {
          setHasDate(false);
          // If no date, reset our date object to today
          setDueDate(new Date());
        }
      } else {
        Alert.alert('Error', data.error || 'Could not parse task');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not connect to the ML server.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(dueDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDueDate(newDate);
      setHasDate(true);
      if (Platform.OS === 'android') {
        setShowTimePicker(true);
      }
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newTime = new Date(dueDate);
      newTime.setHours(selectedTime.getHours());
      newTime.setMinutes(selectedTime.getMinutes());
      setDueDate(newTime);
      setHasDate(true);
    }
  };

  const debouncedFetch = useCallback(debounce(fetchTaskPredictions, 500), []);

  const handleNlpInputChange = text => {
    setNlpInput(text);
    debouncedFetch(text);
  };

  const handleSave = async () => {
    if (!taskName) {
      Alert.alert('Please enter a task name.');
      return;
    }

    // Prepare the data to send to the server
    const taskData = {
      task_name: taskName,
      // Send due date as an ISO string if it was set
      due_date: hasDate ? dueDate.toISOString() : null,
      predicted_time_min: rawPredictedTime,
      predicted_priority: predictedPriority,
    };

    console.log('Saving task:', taskData);

    try {
      const response = await fetch(`${API_URL}/api/v1/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        // const savedTask = await response.json();
        // console.log('Task saved successfully:', savedTask);
        navigation.goBack(); // Close the modal on success
      } else {
        const errorData = await response.json();
        Alert.alert('Save Failed', errorData.error || 'Could not save task');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not connect to the server to save.');
    }
  };

  const getFormattedDate = () => {
    if (!hasDate) return 'Set Date';
    return dueDate.toLocaleString();
  };
  const showPicker = () => {
    if (Platform.OS === 'android') {
      setShowDatePicker(true); // Start the chain
    } else {
      // For iOS, mode='datetime' works, so we only need one
      setShowDatePicker(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close-outline" size={30} color="#555" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Task</Text>
        {/* Updated to call handleSave */}
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.content}>
          <Text style={styles.label}>What's the task?</Text>
          <TextInput
            style={styles.nlpInput}
            placeholder="e.g., Submit OS assignment by Tuesday 5pm"
            value={nlpInput}
            onChangeText={handleNlpInputChange}
          />
          {isLoading && <Text style={styles.loadingText}>Parsing...</Text>}

          <View style={styles.divider} />

          <Text style={styles.label}>Task Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Submit OS assignment"
            value={taskName}
            onChangeText={setTaskName}
          />

          <Text style={styles.label}>Due Date</Text>
          <TouchableOpacity style={styles.dateButton} onPress={showPicker}>
            <Icon name="calendar-outline" size={20} color="#555" />
            <Text
              style={[
                styles.dateButtonText,
                !hasDate && styles.dateButtonPlaceholder,
              ]}
            >
              {getFormattedDate()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              testID="datePicker"
              value={dueDate}
              mode={Platform.OS === 'android' ? 'date' : 'datetime'}
              is24Hour={true}
              display="default"
              onChange={onDateChange}
            />
          )}

          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              testID="timePicker"
              value={dueDate}
              mode={'time'}
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )}
          <View style={styles.mlSection}>
            <View style={styles.mlBox}>
              <Text style={styles.mlLabel}>✨ Est. Time (ML)</Text>
              <Text style={styles.mlValue}>{predictedTime || '...'}</Text>
            </View>
            <View style={styles.mlBox}>
              <Text style={styles.mlLabel}>🔥 Priority (ML)</Text>
              <Text style={styles.mlValue}>{predictedPriority || '...'}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Styles (No Changes) ---
const styles = StyleSheet.create({
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButtonText: {
    ...getFont('regular', 16), // FONT
    fontWeight: '400',
    color: '#000',
    marginLeft: 10,
  },
  dateButtonPlaceholder: {
    color: '#aaa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f4f7fe',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    ...getFont('bold', 18), // FONT
    fontWeight: 'bold',
    color: '#000',
  },
  saveButton: {
    ...getFont('bold', 16), // FONT
    fontWeight: 'bold',
    color: '#007AFF',
  },
  content: {
    padding: 16,
  },
  label: {
    ...getFont('medium', 14), // FONT
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
    marginTop: 16,
  },
  nlpInput: {
    ...getFont('regular', 16), // FONT
    fontWeight: '400',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textInput: {
    ...getFont('regular', 16), // FONT
    fontWeight: '400',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  mlSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  mlBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
  },
  mlLabel: {
    ...getFont('regular', 12), // FONT
    fontWeight: '400',
    color: '#555',
    marginBottom: 4,
  },
  mlValue: {
    ...getFont('semibold', 16), // FONT
    fontWeight: '600',
    color: '#000',
  },
  loadingText: {
    ...getFont('regular', 14), // FONT
    fontWeight: '400',
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#555',
    marginTop: 8,
  },
});
