import { Platform } from 'react-native';
import {
  GoogleSignin, statusCodes, isErrorWithCode, isSuccessResponse, ensureGoogleSignInConfigured,
} from '../config/googleSignIn';

export function useGoogleSignIn(
  oauthLogin: (provider: string, idToken: string, displayName?: string) => Promise<void>,
) {
  const handleGoogleSignIn = async (
    setError: (msg: string) => void,
    setLoading: (loading: boolean) => void,
    options?: { displayName?: string; errorMessage?: string },
  ) => {
    setError('');
    setLoading(true);
    try {
      ensureGoogleSignInConfigured();
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response) && response.data.idToken) {
        await oauthLogin('google', response.data.idToken, options?.displayName);
      }
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      console.error('Google sign-in error:', error);
      setError(options?.errorMessage ?? 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return { handleGoogleSignIn };
}
