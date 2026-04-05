import { renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { useNotificationListener } from '../useNotifications';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useNotificationListener', () => {
  const mockNavigationRef = {
    current: {
      isReady: jest.fn(() => true),
      navigate: jest.fn(),
      goBack: jest.fn(),
    },
  } as any;

  it('checks for cold-start notification on mount', () => {
    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValue(null);

    renderHook(() => useNotificationListener(mockNavigationRef, true));

    expect(Notifications.getLastNotificationResponse).toHaveBeenCalled();
  });

  it('sets up notification response listener', () => {
    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValue(null);

    renderHook(() => useNotificationListener(mockNavigationRef, true));

    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
  });

  it('navigates to CardDetail when cold-start notification has cardId', () => {
    const mockResponse = {
      notification: {
        request: {
          content: {
            data: { screen: 'CardDetail', cardId: 42 },
          },
        },
      },
    };
    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValue(mockResponse);
    mockNavigationRef.current.isReady.mockReturnValue(true);

    renderHook(() => useNotificationListener(mockNavigationRef, true));

    expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('CardDetail', { id: 42 });
  });

  it('navigates to Dashboard when notification has no specific screen data', () => {
    const mockResponse = {
      notification: {
        request: {
          content: { data: {} },
        },
      },
    };
    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValue(mockResponse);
    mockNavigationRef.current.isReady.mockReturnValue(true);

    renderHook(() => useNotificationListener(mockNavigationRef, true));

    expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Dashboard');
  });

  it('retries navigation when navigator is not ready', () => {
    jest.useFakeTimers();

    const mockResponse = {
      notification: {
        request: {
          content: { data: { screen: 'CardDetail', cardId: 7 } },
        },
      },
    };
    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValue(mockResponse);
    mockNavigationRef.current.isReady
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    renderHook(() => useNotificationListener(mockNavigationRef, true));

    expect(mockNavigationRef.current.navigate).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(mockNavigationRef.current.navigate).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('CardDetail', { id: 7 });

    jest.useRealTimers();
  });

  it('does nothing when enabled is false', () => {
    renderHook(() => useNotificationListener(mockNavigationRef, false));

    expect(Notifications.getLastNotificationResponse).not.toHaveBeenCalled();
    expect(Notifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
  });

  it('cleans up listener on unmount', () => {
    const mockRemove = jest.fn();
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({
      remove: mockRemove,
    });
    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValue(null);

    const { unmount } = renderHook(() => useNotificationListener(mockNavigationRef, true));
    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });
});
