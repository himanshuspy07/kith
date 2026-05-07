# Kith Automatic Notification System

To enable background notifications that deliver even when the app is closed, you must deploy the following Firebase Cloud Function. This function "watches" for new messages and triggers a push to the recipients' devices.

## 1. The Cloud Function Code (index.js)

```javascript
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.notifyOnNewMessage = onDocumentCreated("/chatRooms/{chatRoomId}/messages/{messageId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const messageData = snapshot.data();
  const chatRoomId = event.params.chatRoomId;
  const senderId = messageData.senderId;

  const db = getFirestore();

  // 1. Get Room Details to find members
  const roomSnap = await db.doc(`chatRooms/${chatRoomId}`).get();
  const roomData = roomSnap.data();
  if (!roomData || !roomData.memberIds) return;

  // 2. Get Sender Name for the notification title
  const senderSnap = await db.doc(`users/${senderId}`).get();
  const senderName = senderSnap.exists ? senderSnap.data().username : "Someone";

  // 3. Prepare notification payload
  const payload = {
    notification: {
      title: roomData.isGroupChat ? `${roomData.name} - ${senderName}` : senderName,
      body: messageData.type === 'image' ? "📷 Sent a photo" : messageData.content,
    },
    data: {
      roomId: chatRoomId,
    }
  };

  // 4. Collect tokens for all members EXCEPT the sender
  const tokens = [];
  for (const memberId of roomData.memberIds) {
    if (memberId === senderId) continue;

    const userSnap = await db.doc(`users/${memberId}`).get();
    const userData = userSnap.data();
    if (userData && userData.fcmTokens) {
      tokens.push(...userData.fcmTokens);
    }
  }

  if (tokens.length === 0) return;

  // 5. Send notifications
  const uniqueTokens = [...new Set(tokens)];
  try {
    const response = await getMessaging().sendEachForMulticast({
      tokens: uniqueTokens,
      notification: payload.notification,
      data: payload.data,
      webpush: {
        fcmOptions: {
          link: `https://kith.indevs.in/?roomId=${chatRoomId}`
        }
      }
    });
    console.log(`${response.successCount} messages sent successfully`);
  } catch (error) {
    console.error("Error sending notifications:", error);
  }
});
```

## 2. Deployment Instructions

1. **Install Firebase CLI**: `npm install -g firebase-tools`
2. **Login**: `firebase login`
3. **Initialize**: In your project root, run `firebase init functions`.
4. **Select Project**: Select your project `studio-7823896099-d3f14`.
5. **Paste Code**: Replace the contents of `functions/index.js` with the code above.
6. **Deploy**: Run `firebase deploy --only functions`.

## 3. Client Side Setup
The application is already configured to:
- Register a Service Worker (`sw.js` and `firebase-messaging-sw.js`).
- Request notification permissions from the user.
- Save unique device tokens to `users/{userId}/fcmTokens` in Firestore.
