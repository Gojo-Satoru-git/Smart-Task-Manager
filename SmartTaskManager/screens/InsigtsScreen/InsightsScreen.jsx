import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Dimensions, // Import Dimensions
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
// --- 1. Import the BarChart ---
import { BarChart } from 'react-native-chart-kit';
import { URL } from '../../ip';

const API_URL = URL.barath; // Replace with your IP

// Get the screen width
const screenWidth = Dimensions.get('window').width;

// --- 2. Define Chart Configuration ---
const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0, // No decimal places
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`, // Blue color
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#007AFF',
  },
};

export const InsightsScreen = () => {
  const [insight, setInsight] = useState('');
  const [chartData, setChartData] = useState(null); // --- 3. State for chart data ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/insights`);
      const data = await response.json();
      if (response.ok) {
        setInsight(data.insight);
        // --- 4. Set the chart data from the server ---
        setChartData(data.daily_summary);
      } else {
        setError(data.error || 'Failed to fetch insights');
      }
    } catch (e) {
      setError('Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInsights();
    }, [])
  );

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color="#007AFF" />;
    }
    if (error) {
      return <Text style={styles.errorText}>Error: {error}</Text>;
    }
    return (
      <View>
        {/* --- 5. Insight Text Box --- */}
        <Text style={styles.sectionTitle}>Your Habit</Text>
        <View style={styles.insightBox}>
          <Text style={styles.insightText}>{insight}</Text>
        </View>

        {/* --- 6. Bar Chart --- */}
        <Text style={styles.sectionTitle}>Weekly Productivity</Text>
        {chartData ? (
          <BarChart
            data={chartData}
            width={screenWidth - 40} // Full width minus padding
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            fromZero={true}
            style={styles.chart}
          />
        ) : (
          <Text style={styles.errorText}>No chart data found.</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="stats-chart-outline" size={40} color="#007AFF" />
        <Text style={styles.title}>Productivity Insights</Text>
      </View>
      
      {renderContent()}

      <TouchableOpacity style={styles.refreshButton} onPress={fetchInsights}>
        <Icon name="refresh-outline" size={20} color="#007AFF" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// --- 7. Updated Styles ---
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
    ...getFont('bold', 24), // FONT
    fontWeight: 'bold',
    color: '#000',
    marginTop: 12,
  },
  sectionTitle: {
    ...getFont('semibold', 18), // FONT
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  insightBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightText: {
    ...getFont('medium', 18), // FONT
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    lineHeight: 26,
  },
  errorText: {
    ...getFont('regular', 16), // FONT
    fontWeight: '400',
    color: 'red',
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    padding: 10,
  },
  refreshButtonText: {
    ...getFont('medium', 16), // FONT
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
  },
});