import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

let configured = false;

export function ensureGoogleSignInConfigured() {
  if (configured) return;
  const webClientId = Constants.expoConfig?.extra?.googleClientId;
  const iosClientId = Constants.expoConfig?.extra?.googleClientIdIos;
  if (!webClientId) {
    throw new Error('Missing googleClientId in app config — check GOOGLE_CLIENT_ID env var');
  }
  GoogleSignin.configure({ webClientId, iosClientId });
  configured = true;
}

export { GoogleSignin, statusCodes, isErrorWithCode, isSuccessResponse };
