import { createRef } from 'react';
import { NavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createRef<NavigationContainerRef<any>>();

export function navigateToChatRoom(conversationId: string, title: string) {
  navigationRef.current?.dispatch(
    CommonActions.navigate('Chat', {
      screen: 'ChatRoom',
      params: { conversationId, title },
    }),
  );
}
