import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const { width: screenW, height: screenH } = Dimensions.get('window');

interface Props {
  children: React.ReactNode;
  keyboard?: boolean;  // enable keyboard avoiding
  padBottom?: boolean; // add bottom safe area padding (for screens without FABs)
}

export default function ScreenWrapper({ children, keyboard = false, padBottom = true }: Props) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[styles.container, {
      paddingTop: insets.top,
      paddingBottom: padBottom ? insets.bottom : 0,
      paddingLeft: Math.max(insets.left, 8),
      paddingRight: Math.max(insets.right, 8),
    }]}>
      {/* Watermark */}
      <Image
        source={require('../../assets/icon.png')}
        style={styles.watermark}
        resizeMode="contain"
      />
      {children}
    </View>
  );

  if (keyboard) {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgPrimary },
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  watermark: {
    position: 'absolute',
    width: screenW * 0.6,
    height: screenW * 0.6,
    top: (screenH - screenW * 0.6) / 2,
    left: (screenW - screenW * 0.6) / 2,
    opacity: 0.10,
  },
});
