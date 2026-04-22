# **App Name**: Kith

## Core Features:

- User Authentication: Secure user signup and login processes using JWT, providing access to protected routes.
- One-on-One Messaging: Send and receive real-time private messages between individual users.
- Group Chat Rooms: Create and participate in real-time group conversations with multiple users.
- Persistent Message History: Store all message history in MongoDB, displayed with infinite scroll for efficient loading.
- Real-time Presence: Display online/offline status and typing indicators for active conversations.
- File & Image Sharing: Upload and share files and images within chats, leveraging Cloudinary for storage.

## Style Guidelines:

- Primary color: '#4A90E2' (a muted, stable blue) for interactive elements, highlights, and primary branding to evoke reliability and connection.
- Background color: '#1B1E22' (a dark blue-grey) to provide a sophisticated and eye-friendly dark theme experience for prolonged chat usage. (Note: A light/dark theme toggle will be excluded from the MVP scope).
- Accent color: '#87D0BF' (a calm mint-green/cyan) for secondary actions, new message indicators, and subtle visual cues, creating visual interest without distracting.
- All text will use 'Inter', a grotesque-style sans-serif, for its modern, neutral, and highly readable characteristics, suitable for both headlines and extensive body text in a chat application.
- Utilize a consistent set of minimalist, outlined icons for actions and navigation, maintaining a clean and modern aesthetic that complements the overall interface.
- Employ a responsive and mobile-first layout with Tailwind CSS, featuring clear separation between chat lists and active conversation views, ensuring optimal usability across all device sizes.
- Incorporate subtle and quick animations for actions such as sending messages, status updates, and view transitions to provide smooth user feedback without being intrusive.