import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// This is a reusable button for our modal list
const ModalButton = ({ text, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{text}</Text>
  </TouchableOpacity>
);

const FeedbackModal = ({
  visible,
  onClose,
  onSubmit,
  predictedTime,
}) => {
  
  // This is our list of options
  const options = [
    { text: "15 min", value: 15 },
    { text: "30 min", value: 30 },
    { text: "45 min", value: 45 },
    { text: "1 hour", value: 60 },
    { text: "1.5 hours", value: 90 },
    { text: "2 hours", value: 120 },
    { text: "3+ hours", value: 180 },
  ];

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.title}>Task Complete!</Text>
          <Text style={styles.subTitle}>
            How long did this task actually take?
          </Text>
          
          <ScrollView style={styles.optionsList}>
            {/* The prediction button */}
            <ModalButton
              text={`Use prediction (~${predictedTime} min)`}
              onPress={() => onSubmit(predictedTime)}
            />
            
            {/* All other options */}
            {options.map((option) => (
              <ModalButton
                key={option.value}
                text={option.text}
                onPress={() => onSubmit(option.value)}
              />
            ))}
          </ScrollView>
          
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    ...getFont('bold', 22),
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subTitle: {
    ...getFont('regular', 16),
    fontWeight: '400',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsList: {
    width: '100%',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#f4f7fe',
    borderRadius: 10,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    ...getFont('medium', 16),
    fontWeight: '500',
    color: '#007AFF',
  },
  cancelText: {
    ...getFont('regular', 16),
    fontWeight: '400',
    color: '#555',
    marginTop: 10,
  },
});
export default FeedbackModal;