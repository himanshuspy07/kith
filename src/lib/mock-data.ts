
export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
  lastSeen?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  reactions?: string[];
}

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  name?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
}

export const CURRENT_USER: User = {
  id: 'me',
  name: 'Alex Rivera',
  avatar: 'https://picsum.photos/seed/me/100/100',
  status: 'online',
};

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Jordan Smith', avatar: 'https://picsum.photos/seed/user1/100/100', status: 'online' },
  { id: '2', name: 'Casey Wilson', avatar: 'https://picsum.photos/seed/user2/100/100', status: 'offline', lastSeen: '2h ago' },
  { id: '3', name: 'Taylor Bay', avatar: 'https://picsum.photos/seed/user3/100/100', status: 'online' },
  { id: '4', name: 'Morgan Lee', avatar: 'https://picsum.photos/seed/user4/100/100', status: 'offline', lastSeen: '10m ago' },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    type: 'private',
    participants: [CURRENT_USER, MOCK_USERS[0]],
    unreadCount: 2,
    lastMessage: {
      id: 'm1',
      senderId: '1',
      text: 'Hey, did you see the new design specs?',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      status: 'delivered',
      type: 'text',
    },
  },
  {
    id: 'c2',
    type: 'group',
    name: 'Design Team',
    participants: [CURRENT_USER, ...MOCK_USERS],
    unreadCount: 0,
    lastMessage: {
      id: 'm2',
      senderId: '3',
      text: 'I sent the files to the shared folder.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      status: 'read',
      type: 'text',
    },
  },
  {
    id: 'c3',
    type: 'private',
    participants: [CURRENT_USER, MOCK_USERS[1]],
    unreadCount: 0,
    lastMessage: {
      id: 'm3',
      senderId: 'me',
      text: 'Talk soon!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      status: 'read',
      type: 'text',
    },
  },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'c1': [
    { id: 'm1_1', senderId: 'me', text: 'Hi Jordan!', timestamp: '2024-05-20T10:00:00Z', status: 'read', type: 'text' },
    { id: 'm1_2', senderId: '1', text: 'Hey Alex, how are things going with the project?', timestamp: '2024-05-20T10:01:00Z', status: 'read', type: 'text' },
    { id: 'm1_3', senderId: 'me', text: 'Pretty well, just finishing up the mobile views.', timestamp: '2024-05-20T10:02:00Z', status: 'read', type: 'text' },
    { id: 'm1_4', senderId: '1', text: 'Awesome! Send me a screenshot when you can.', timestamp: '2024-05-20T10:03:00Z', status: 'read', type: 'text' },
    { id: 'm1_5', senderId: '1', text: 'Hey, did you see the new design specs?', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), status: 'delivered', type: 'text' },
  ],
  'c2': [
    { id: 'm2_1', senderId: '2', text: 'Meeting starting in 5 mins', timestamp: '2024-05-20T09:00:00Z', status: 'read', type: 'text' },
    { id: 'm2_2', senderId: '3', text: 'I sent the files to the shared folder.', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), status: 'read', type: 'text' },
  ],
};
