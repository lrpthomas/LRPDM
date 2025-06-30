import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useWindowManager } from './WindowManager';
import Window from './Window';

const WindowContainer: React.FC = () => {
  const { state } = useWindowManager();

  return (
    <View style={[styles.container, { pointerEvents: 'box-none' }]}>
      {Object.values(state.windows)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((window) => (
          <Window key={window.id} window={window} />
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000
  }
});

export default WindowContainer;