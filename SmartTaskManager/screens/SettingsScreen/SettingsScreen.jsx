import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert, // --- 1. Import Alert ---
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { URL } from '../../ip';

// --- 2. Define API_URL ---
const API_URL = URL.nitin;

// Reusable settings item component
const SettingsItem = ({ label, iconName, onPress }) => (
  // --- 3. Updated to use onPress prop ---
  <TouchableOpacity style={styles.item} onPress={onPress}>
    <View style={styles.itemLeft}>
      <Icon name={iconName} size={22} color="#555" />
      <Text style={styles.itemText}>{label}</Text>
    </View>
    <Icon name="chevron-forward-outline" size={22} color="#ccc" />
  </TouchableOpacity>
);

export const SettingsScreen = () => {
  // --- 4. Add loading state ---
  const [isLoading, setIsLoading] = useState(false);

  // --- 5. Create the handleRetrain function ---
  const handleRetrain = () => {
    // 1. Confirm with the user
    Alert.alert(
      "Know Me Better",
      "This will retrain your AI models on your task history. This can't be undone. Continue?",
      [
        // The "Cancel" button
        {
          text: "Cancel",
          style: "cancel",
        },
        // The "Retrain" button
        {
          text: "Retrain",
          onPress: async () => {
            setIsLoading(true);
            try {
              // 2. Call the new API endpoint
              const response = await fetch(`${API_URL}/api/v1/retrain`, {
                method: 'POST',
              });
              const data = await response.json();

              if (response.ok) {
                // 3. Show success message
                Alert.alert("Success!", data.message);
              } else {
                // 4. Show error/warning message
                Alert.alert("Training Failed", data.message || data.error);
              }
            } catch (e) {
              Alert.alert("Error", "Could not connect to the retraining server.");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* --- 6. Add new "AI Settings" section --- */}
      <Text style={styles.sectionTitle}>AI Settings</Text>
      <View style={styles.section}>
        {isLoading ? (
          <ActivityIndicator size="large" style={styles.loading} />
        ) : (
          <SettingsItem
            label="Know Me Better"
            iconName="fitness-outline"
            onPress={handleRetrain}
          />
        )}
      </View>
      
      {/* --- (Your other settings) --- */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.section}>
        <SettingsItem label="Profile" iconName="person-circle-outline" />
        <SettingsItem label="Notifications" iconName="notifications-outline" />
      </View>

      <View style={styles.section}>
        <SettingsItem label="Logout" iconName="log-out-outline" />
      </View>
    </ScrollView>
  );
};

// --- 7. Updated styles (with fonts) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fe',
    padding: 20,
  },
  sectionTitle: {
    ...getFont('semibold', 16),
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 10,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden', // To clip the rounded corners
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    ...getFont('medium', 16),
    fontWeight: '500',
    color: '#000',
    marginLeft: 16,
  },
  loading: {
    padding: 20,
  },
});