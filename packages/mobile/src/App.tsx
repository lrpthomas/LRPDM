// Mobile App component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const App: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>LRPDM Mobile App</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});