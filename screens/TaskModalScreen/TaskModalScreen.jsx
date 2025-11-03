import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { StatusBar } from 'react-native/types_generated/index';

export const AddTaskModalScreen = ({ navigation }) => {
  // State to hold the user's natural language input
  const [nlpInput, setNlpInput] = useState('');

  // These states will eventually be set by your ML models
  const [taskName, setTaskName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [predictedTime, setPredictedTime] = useState('');
  const [predictedPriority, setPredictedPriority] = useState('');

  // This function is a placeholder for your NLP model
  const handleNlpInputChange = (text) => {
    setNlpInput(text);
    
    // --- ML MODEL LOGIC (Placeholder) ---
    // In the future, this is where you'd send 'text' to your NLP model.
    // For now, we'll just simulate it:
    if (text.toLowerCase().includes('assignment')) {
      setTaskName('Assignment');
      setDueDate('Tomorrow');
      setPredictedTime('~ 1 hr 30 min');
      setPredictedPriority('🔴 High');
    } else {
      // Clear fields if input doesn't match
      setTaskName('');
      setDueDate('');
      setPredictedTime('');
      setPredictedPriority('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close-outline" size={30} color="#555" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Task</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.content}>
          {/* 2. NLP Input Field */}
          <Text style={styles.label}>What's the task?</Text>
          <TextInput
            style={styles.nlpInput}
            placeholder="e.g., Submit OS assignment by Tuesday 5pm"
            value={nlpInput}
            onChangeText={handleNlpInputChange}
          />

          {/* 3. Parsed & Predicted Fields */}
          <View style={styles.divider} />

          <Text style={styles.label}>Task Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Submit OS assignment"
            value={taskName}
            onChangeText={setTaskName}
          />
          
          <Text style={styles.label}>Due Date</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Tomorrow"
            value={dueDate}
            onChangeText={setDueDate}
          />

          {/* 4. ML Prediction Read-Only Fields */}
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

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fe', // Same background as TaskList
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
    marginTop: 16,
  },
  nlpInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top', // For Android
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  mlValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});