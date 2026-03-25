import * as ImagePicker from 'expo-image-picker';
import { authorizedRequest } from './http';
import type { User } from '../types';

export const profileService = {
  async pickAndUploadAvatar(): Promise<string> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('Photo library permission denied.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:   ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect:        [1, 1],
      quality:       0.8,
      base64:        true,
    });

    if (result.canceled || !result.assets?.[0]) throw new Error('No image selected.');

    const asset    = result.assets[0];
    const base64   = asset.base64;
    const mimeType = asset.mimeType ?? 'image/jpeg';

    if (!base64) throw new Error('Could not read image data.');

    const { avatar_url } = await authorizedRequest<{ avatar_url: string }>(
      'POST',
      '/users/me/avatar',
      { image_base64: base64, mime_type: mimeType },
    );

    return avatar_url;
  },

  updateProfile(fields: Partial<Pick<User, 'name' | 'bio' | 'avatar_url'>>) {
    return authorizedRequest<{ user: User }>('PATCH', '/users/me', fields);
  },
};
