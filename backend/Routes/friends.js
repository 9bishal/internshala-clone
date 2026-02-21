const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

let db;

// Send friend request
router.post("/send-request", async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;

    if (!fromUserId || !toUserId) {
      return res.status(400).json({ message: "Both user IDs are required" });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    db = admin.firestore();

    // Check if request already exists
    const existingRequest = await db
      .collection("friend_requests")
      .where("fromUserId", "==", fromUserId)
      .where("toUserId", "==", toUserId)
      .where("status", "==", "pending")
      .get();

    if (!existingRequest.empty) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Check if they are already friends
    const existingFriendship = await db
      .collection("friendships")
      .where("users", "array-contains", fromUserId)
      .get();

    const alreadyFriends = existingFriendship.docs.some((doc) => {
      const data = doc.data();
      return data.users.includes(toUserId);
    });

    if (alreadyFriends) {
      return res.status(400).json({ message: "Already friends" });
    }

    // Create friend request
    const requestId = uuidv4();
    const friendRequest = {
      id: requestId,
      fromUserId,
      toUserId,
      status: "pending",
      createdAt: new Date(),
    };

    await db.collection("friend_requests").doc(requestId).set(friendRequest);

    res.status(200).json({
      message: "Friend request sent successfully",
      request: friendRequest,
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Accept friend request
router.post("/accept-request", async (req, res) => {
  try {
    const { requestId, userId } = req.body;

    if (!requestId || !userId) {
      return res.status(400).json({ message: "Request ID and user ID are required" });
    }

    db = admin.firestore();

    // Get the friend request
    const requestDoc = await db.collection("friend_requests").doc(requestId).get();

    if (!requestDoc.exists) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    const requestData = requestDoc.data();

    // Verify the user is the recipient
    if (requestData.toUserId !== userId) {
      return res.status(403).json({ message: "Not authorized to accept this request" });
    }

    if (requestData.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    // Create friendship
    const friendshipId = uuidv4();
    const friendship = {
      id: friendshipId,
      users: [requestData.fromUserId, requestData.toUserId],
      createdAt: new Date(),
    };

    await db.collection("friendships").doc(friendshipId).set(friendship);

    // Update request status
    await db.collection("friend_requests").doc(requestId).update({
      status: "accepted",
      acceptedAt: new Date(),
    });

    res.status(200).json({
      message: "Friend request accepted",
      friendship,
    });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Reject friend request
router.post("/reject-request", async (req, res) => {
  try {
    const { requestId, userId } = req.body;

    if (!requestId || !userId) {
      return res.status(400).json({ message: "Request ID and user ID are required" });
    }

    db = admin.firestore();

    const requestDoc = await db.collection("friend_requests").doc(requestId).get();

    if (!requestDoc.exists) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    const requestData = requestDoc.data();

    if (requestData.toUserId !== userId) {
      return res.status(403).json({ message: "Not authorized to reject this request" });
    }

    // Update request status
    await db.collection("friend_requests").doc(requestId).update({
      status: "rejected",
      rejectedAt: new Date(),
    });

    res.status(200).json({
      message: "Friend request rejected",
    });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Remove friend
router.post("/remove-friend", async (req, res) => {
  try {
    const { userId, friendId } = req.body;

    if (!userId || !friendId) {
      return res.status(400).json({ message: "Both user IDs are required" });
    }

    db = admin.firestore();

    // Find the friendship
    const friendships = await db
      .collection("friendships")
      .where("users", "array-contains", userId)
      .get();

    const friendshipDoc = friendships.docs.find((doc) => {
      const data = doc.data();
      return data.users.includes(friendId);
    });

    if (!friendshipDoc) {
      return res.status(404).json({ message: "Friendship not found" });
    }

    // Delete the friendship
    await db.collection("friendships").doc(friendshipDoc.id).delete();

    res.status(200).json({
      message: "Friend removed successfully",
    });
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's friends
router.get("/friends/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    db = admin.firestore();

    // Get all friendships for this user
    const friendships = await db
      .collection("friendships")
      .where("users", "array-contains", userId)
      .get();

    const friendIds = friendships.docs.map((doc) => {
      const data = doc.data();
      return data.users.find((id) => id !== userId);
    });

    // Get friend details from users collection
    const friends = [];
    for (const friendId of friendIds) {
      const userDoc = await db.collection("users").doc(friendId).get();
      if (userDoc.exists) {
        friends.push({
          id: friendId,
          ...userDoc.data(),
        });
      }
    }

    res.status(200).json({
      friends,
      count: friends.length,
    });
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get friend count (optimized - doesn't fetch full user data)
router.get("/friends-count/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    db = admin.firestore();

    const friendships = await db
      .collection("friendships")
      .where("users", "array-contains", userId)
      .get();

    res.status(200).json({
      count: friendships.size,
    });
  } catch (error) {
    console.error("Error fetching friend count:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get pending friend requests (received)
router.get("/requests/received/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    db = admin.firestore();

    const requests = await db
      .collection("friend_requests")
      .where("toUserId", "==", userId)
      .where("status", "==", "pending")
      .get();

    const requestList = [];
    for (const doc of requests.docs) {
      const data = doc.data();
      
      // Get sender details
      const senderDoc = await db.collection("users").doc(data.fromUserId).get();
      const sender = senderDoc.exists ? senderDoc.data() : null;

      requestList.push({
        id: doc.id,
        ...data,
        sender,
      });
    }

    res.status(200).json({
      requests: requestList,
      count: requestList.length,
    });
  } catch (error) {
    console.error("Error fetching received requests:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get pending friend requests (sent)
router.get("/requests/sent/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    db = admin.firestore();

    const requests = await db
      .collection("friend_requests")
      .where("fromUserId", "==", userId)
      .where("status", "==", "pending")
      .get();

    const requestList = [];
    for (const doc of requests.docs) {
      const data = doc.data();
      
      // Get recipient details
      const recipientDoc = await db.collection("users").doc(data.toUserId).get();
      const recipient = recipientDoc.exists ? recipientDoc.data() : null;

      requestList.push({
        id: doc.id,
        ...data,
        recipient,
      });
    }

    res.status(200).json({
      requests: requestList,
      count: requestList.length,
    });
  } catch (error) {
    console.error("Error fetching sent requests:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Check friendship status between two users
router.get("/status/:userId/:otherUserId", async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;

    db = admin.firestore();

    // Check if they are friends
    const friendships = await db
      .collection("friendships")
      .where("users", "array-contains", userId)
      .get();

    const areFriends = friendships.docs.some((doc) => {
      const data = doc.data();
      return data.users.includes(otherUserId);
    });

    if (areFriends) {
      return res.status(200).json({
        status: "friends",
        areFriends: true,
      });
    }

    // Check if there's a pending request from current user
    const sentRequest = await db
      .collection("friend_requests")
      .where("fromUserId", "==", userId)
      .where("toUserId", "==", otherUserId)
      .where("status", "==", "pending")
      .get();

    if (!sentRequest.empty) {
      return res.status(200).json({
        status: "request_sent",
        areFriends: false,
        requestId: sentRequest.docs[0].id,
      });
    }

    // Check if there's a pending request to current user
    const receivedRequest = await db
      .collection("friend_requests")
      .where("fromUserId", "==", otherUserId)
      .where("toUserId", "==", userId)
      .where("status", "==", "pending")
      .get();

    if (!receivedRequest.empty) {
      return res.status(200).json({
        status: "request_received",
        areFriends: false,
        requestId: receivedRequest.docs[0].id,
      });
    }

    res.status(200).json({
      status: "none",
      areFriends: false,
    });
  } catch (error) {
    console.error("Error checking friendship status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Search users (for finding friends)
router.get("/search", async (req, res) => {
  try {
    const { query, userId } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    db = admin.firestore();

    console.log(`🔍 [Friends] Searching for "${query}" by userId: ${userId}`);

    // Note: Firestore doesn't support full-text search
    // For production, consider using Algolia or Elasticsearch
    // This is a simple implementation
    const users = await db.collection("users").limit(100).get();

    // Use a Set to track seen UIDs to prevent duplicates
    const seenUids = new Set();

    const searchResults = users.docs
      .filter((doc) => {
        const userData = doc.data();
        const docUid = userData.uid;
        
        // Exclude current user by uid comparison
        if (docUid === userId) {
          return false;
        }
        
        // Exclude duplicates
        if (seenUids.has(docUid)) {
          return false;
        }
        
        seenUids.add(docUid);
        
        const searchLower = query.toLowerCase();
        const nameLower = (userData.name || "").toLowerCase();
        const emailLower = (userData.email || "").toLowerCase();
        
        return nameLower.includes(searchLower) || emailLower.includes(searchLower);
      })
      .map((doc) => ({
        id: doc.id,
        uid: doc.data().uid,
        name: doc.data().name,
        email: doc.data().email,
        photo: doc.data().photo,
      }));

    console.log(`✅ [Friends] Search for "${query}" returned ${searchResults.length} users`);

    res.status(200).json({
      users: searchResults,
      count: searchResults.length,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's friends list
router.get("/list", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    db = admin.firestore();

    console.log(`🔍 [Friends] Fetching friends list for userId: ${userId}`);

    // Get all friendships where userId is involved
    const friendships = await db
      .collection("friendships")
      .where("users", "array-contains", userId)
      .get();

    const friendIds = [];
    friendships.docs.forEach((doc) => {
      const data = doc.data();
      const otherUserId = data.users.find((u) => u !== userId);
      if (otherUserId) {
        friendIds.push(otherUserId);
      }
    });

    console.log(`Found ${friendIds.length} friend IDs:`, friendIds);

    // Get user documents for all friends
    const friendsPromises = friendIds.map((friendId) =>
      db.collection("users").where("uid", "==", friendId).get()
    );

    const friendDocs = await Promise.all(friendsPromises);
    
    const friends = [];
    friendDocs.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        friends.push({
          userId: data.uid,
          name: data.name || "User",
          email: data.email || "",
          photo: data.photo || null,
        });
      });
    });

    console.log(`✅ [Friends] Fetched ${friends.length} friends`);

    res.status(200).json({
      friends: friends,
      count: friends.length,
    });
  } catch (error) {
    console.error("Error fetching friends list:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all users (excluding current user, friends, and pending requests)
router.get("/all-users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    db = admin.firestore();

    console.log(`🔍 [Friends] Fetching all users for userId: ${userId}`);

    // Get all users
    const usersSnapshot = await db.collection("users").limit(100).get();
    
    // Use a Set to track seen UIDs to prevent duplicates
    const seenUids = new Set();
    
    // Filter to exclude current user - show all others with their status
    const allUsers = usersSnapshot.docs
      .filter((doc) => {
        const userData = doc.data();
        const docUid = userData.uid;
        
        // Log for debugging
        console.log(`Checking user: id=${doc.id}, uid=${docUid}, comparing with userId=${userId}`);
        
        // Exclude current user by uid comparison
        if (docUid === userId) {
          console.log(`❌ Excluding current user: ${docUid}`);
          return false;
        }
        
        // Exclude duplicates
        if (seenUids.has(docUid)) {
          console.log(`❌ Excluding duplicate: ${docUid}`);
          return false;
        }
        
        seenUids.add(docUid);
        return true;
      })
      .map((doc) => ({
        id: doc.id,
        uid: doc.data().uid,
        name: doc.data().name,
        email: doc.data().email,
        photo: doc.data().photo,
      }));

    console.log(`✅ [Friends] Fetched ${allUsers.length} users (excluding ${userId})`);
    console.log(`✅ [Friends] Users returned:`, allUsers.map(u => `${u.name}(${u.uid})`));

    res.status(200).json({
      users: allUsers,
      count: allUsers.length,
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
