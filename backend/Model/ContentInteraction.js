// ContentInteraction collection schema in Firestore for sharing content between users
//
// contentInteractions collection:
// {
//   id: String (UUID),
//   sharedBy: {
//     userId: String,
//     name: String,
//     email: String
//   },
//   sharedWith: {
//     userId: String,
//     name: String,
//     email: String
//   },
//   content: {
//     postId: String,
//     caption: String,
//     mediaUrls: [String],
//     originalPoster: {
//       userId: String,
//       name: String
//     }
//   },
//   sharedMessage: String (optional personal message),
//   isRead: Boolean,
//   readAt: Timestamp (optional),
//   interactions: [
//     {
//       type: 'like' | 'comment',
//       userId: String,
//       value: String (comment text),
//       createdAt: Timestamp
//     }
//   ],
//   createdAt: Timestamp,
//   updatedAt: Timestamp
// }

module.exports = {
  // This file serves as reference documentation for the contentInteractions Firestore collection
};
