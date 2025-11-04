import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Reusable settings item component
const SettingsItem = ({ label, iconName }) => (
  <TouchableOpacity style={styles.item}>
    <View style={styles.itemLeft}>
      <Icon name={iconName} size={22} color="#555" />
      <Text style={styles.itemText}>{label}</Text>
    </View>
    <Icon name="chevron-forward-outline" size={22} color="#ccc" />
  </TouchableOpacity>
);

export const SettingsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <SettingsItem label="Account" iconName="person-circle-outline" />
        <SettingsItem label="Notifications" iconName="notifications-outline" />
        <SettingsItem label="Appearance" iconName="contrast-outline" />
      </View>

      <View style={styles.section}>
        <SettingsItem label="Connected Apps" iconName="apps-outline" />
        <SettingsItem label="Privacy" iconName="lock-closed-outline" />
      </View>

      <View style={styles.section}>
        <SettingsItem label="Help" iconName="help-circle-outline" />
        <SettingsItem label="Logout" iconName="log-out-outline" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fe',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
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
    fontSize: 16,
    color: '#000',
    marginLeft: 16,
  },
});