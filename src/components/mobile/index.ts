/**
 * Mobile Components Index
 * LC-FEAT-031: Mobile App Companion
 */

// Camera and media capture
export { CameraCapture } from "./CameraCapture";
export type { CapturedMedia } from "./CameraCapture";

// QR code scanning
export { QRScanner } from "./QRScanner";

// Voice notes with transcription
export { VoiceNotes } from "./VoiceNotes";
export type { VoiceNote } from "./VoiceNotes";

// Geolocation features
export { GeolocationTip } from "./GeolocationTip";
export type { LocationData } from "./GeolocationTip";

// Emergency contacts
export { EmergencyContacts } from "./EmergencyContacts";
export type { EmergencyContact } from "./EmergencyContacts";

// Biometric authentication
export { BiometricAuth, isWebAuthnSupported, isPlatformAuthenticatorAvailable } from "./BiometricAuth";
export type { WebAuthnCredential } from "./BiometricAuth";

// Nearby case alerts
export { NearbyCaseAlerts } from "./NearbyCaseAlerts";
export type { NearbyCase } from "./NearbyCaseAlerts";

// LE-specific components
export { LEFieldDataForm } from "./LEFieldDataForm";
export type { FieldEntry, FieldEntryType, FieldAttachment } from "./LEFieldDataForm";
