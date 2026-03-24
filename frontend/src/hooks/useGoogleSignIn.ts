import { useEffect, useCallback, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- GIS SDK global, no @types available
declare const google: any;

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const MAX_INIT_ATTEMPTS = 20; // 20 × 300ms = 6s max wait for SDK

/**
 * Hook that initializes a Google Sign-In button using the GIS SDK directly.
 *
 * The @react-oauth/google GoogleLogin component's popup callback uses
 * postMessage relay which fails silently. This hook calls the SDK directly,
 * registering the callback synchronously in the same window context.
 *
 * @param onCredential - called with the Google ID token (JWT) on successful sign-in
 * @param buttonText - 'signin_with' | 'signup_with' | 'signin' | 'continue_with'
 * @returns ref to attach to the container div for the Google button
 */
export function useGoogleSignIn(
  onCredential: (credential: string) => void,
  buttonText: string = 'signin_with',
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stableCallback = useCallback(onCredential, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout>;
    let attempts = 0;

    const tryInit = () => {
      if (cancelled) return;
      if (!containerRef.current) return;

      if (typeof google === 'undefined' || !google.accounts?.id) {
        if (++attempts < MAX_INIT_ATTEMPTS) {
          timerId = setTimeout(tryInit, 300);
        }
        return;
      }

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          if (!cancelled) {
            stableCallback(response.credential);
          }
        },
      });

      if (containerRef.current) {
        google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 352,
          text: buttonText,
        });
      }
    };

    tryInit();

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [stableCallback, buttonText]);

  return containerRef;
}
