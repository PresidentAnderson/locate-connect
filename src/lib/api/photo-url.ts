/** Restrict server-side photo downloads to the application's upload buckets. */
export function trustedPhotoUrl(value: string, storageUrl: string | undefined): string {
  if (!storageUrl) throw new Error('Photo storage is not configured');
  const storage = new URL(storageUrl);
  const photo = new URL(value);
  const allowedPaths = ['case-photos', 'facial-recognition-photos'].map(
    bucket => `/storage/v1/object/public/${bucket}/`,
  );
  if (
    storage.protocol !== 'https:' || photo.protocol !== 'https:' ||
    photo.origin !== storage.origin || photo.username || photo.password ||
    !allowedPaths.some(prefix => photo.pathname.startsWith(prefix))
  ) {
    throw new Error('Photo URL must refer to an uploaded application photo');
  }
  return photo.href;
}
