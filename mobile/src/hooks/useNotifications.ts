import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import type { EventSubscription } from 'expo-modules-core';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';

export function useNotificationListener(
  navigationRef: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>,
  enabled: boolean = true,
) {
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Cold-start: app launched by tapping a notification
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      handleNotificationResponse(lastResponse, navigationRef);
    }

    // Warm/background: notification tapped while app is running
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationResponse(response, navigationRef);
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [navigationRef, enabled]);
}

function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  navigationRef: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>,
) {
  const data = response.notification.request.content.data;
  let attempts = 0;
  const tryNavigate = () => {
    if (!navigationRef.current?.isReady()) {
      if (++attempts > 50) return; // Give up after 5 seconds
      setTimeout(tryNavigate, 100);
      return;
    }
    if (data?.screen === 'CardDetail' && data?.cardId) {
      (navigationRef as any).current.navigate('CardDetail', { id: data.cardId });
    } else {
      (navigationRef as any).current.navigate('Dashboard');
    }
  };
  tryNavigate();
}
