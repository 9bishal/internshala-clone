// This file is kept for reference only
// Using Firebase Firestore instead of MongoDB
// 
// Post collection schema in Firestore:
// {
//   postId: String (UUID),
//   userId: String,
//   mediaUrls: [String],
//   caption: String,
//   likes: [
//     {
//       userId: String,
//       createdAt: Timestamp
//     }
//   ],
//   comments: [
//     {
//       commentId: String (UUID),
//       userId: String,
//       text: String,
//       likes: [String],
//       createdAt: Timestamp
//     }
//   ],
//   shares: [
//     {
//       userId: String,
//       sharedAt: Timestamp
//     }
//   ],
//   createdAt: Timestamp,
//   updatedAt: Timestamp
// }
