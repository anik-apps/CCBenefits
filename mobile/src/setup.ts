import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager, focusManager } from '@tanstack/react-query';

export function setupQueryClient() {
  // Online/offline detection for React Native
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected);
    });
  });

  // App focus refetching for React Native
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener('change', (state) => {
      setFocused(state === 'active');
    });
    return () => sub.remove();
  });
}
