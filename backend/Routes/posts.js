const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

let db;

// Helper function to check posting limit based on friend count
const checkPostingLimit = async (userId) => {
  try {
    db = admin.firestore();
    
    // Get friend count from friendships collection
    const friendships = await db
      .collection("friendships")
      .where("users", "array-contains", userId)
      .get();

    const friendCount = friendships.size;

    // Get today's posts count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all posts by user and filter in memory (avoids index requirement)
    const allUserPosts = await db
      .collection("posts")
      .where("userId", "==", userId)
      .get();

    // Filter posts created today in JavaScript
    const todaysPostCount = allUserPosts.docs.filter(doc => {
      const postData = doc.data();
      if (!postData.createdAt) return false;
      
      // Handle both Firestore Timestamp and regular Date objects
      const postDate = postData.createdAt.toDate 
        ? postData.createdAt.toDate() 
        : new Date(postData.createdAt);
      
      return postDate >= today;
    }).length;

    // Determine limit based on friend count
    let limit = 0;
    let canPost = false;
    let reason = "";

    if (friendCount === 0) {
      limit = 0;
      canPost = false;
      reason = "You need at least 1 friend to post. Start connecting with others!";
    } else if (friendCount === 1) {
      limit = 1;
      canPost = todaysPostCount < 1;
      reason = canPost ? "You can post 1 time today" : "Daily limit reached (1 post with 1 friend)";
    } else if (friendCount === 2) {
      limit = 2;
      canPost = todaysPostCount < 2;
      reason = canPost ? "You can post 2 times today" : "Daily limit reached (2 posts with 2 friends)";
    } else if (friendCount >= 10) {
      limit = -1; // Unlimited
      canPost = true;
      reason = "Unlimited posts! (10+ friends)";
    } else {
      // 3-9 friends: post count = friend count
      limit = friendCount;
      canPost = todaysPostCount < friendCount;
      reason = canPost 
        ? `You can post ${friendCount} times today` 
        : `Daily limit reached (${friendCount} posts with ${friendCount} friends)`;
    }

    return {
      canPost,
      limit,
      todaysPostCount,
      friendCount,
      reason,
    };
  } catch (error) {
    console.error("Error checking posting limit:", error);
    return { 
      canPost: false, 
      error: error.message,
      reason: "Error checking posting limit"
    };
  }
};

// Helper function to serialize Firestore objects
const serializeFirestoreData = (obj) => {
  if (obj === null || obj === undefined) return obj;

  if (obj.toDate && typeof obj.toDate === "function") {
    return obj.toDate().toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeFirestoreData(item));
  }

  if (typeof obj === "object") {
    const converted = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = serializeFirestoreData(obj[key]);
      }
    }
    return converted;
  }

  return obj;
};

// POST /api/posts/check-limit - Check posting limit
router.post("/check-limit", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const limitCheck = await checkPostingLimit(userId);
    res.status(200).json(limitCheck);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to check posting limit" });
  }
});

// POST /api/posts - Create a new post
router.post("/", async (req, res) => {
  try {
    const { userId, mediaUrls, caption } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Check posting limit
    const limitCheck = await checkPostingLimit(userId);

    if (!limitCheck.canPost) {
      return res.status(403).json({
        error: "Cannot post",
        reason: limitCheck.reason || "Daily posting limit reached",
        details: limitCheck,
      });
    }

    const postData = {
      postId: uuidv4(),
      userId,
      mediaUrls: mediaUrls || [],
      caption: caption || "",
      likes: [],
      comments: [],
      shares: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db = admin.firestore();
    const docRef = await db.collection("posts").add(postData);
    const serializedData = serializeFirestoreData({
      _id: docRef.id,
      ...postData,
    });

    res.status(201).json(serializedData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// GET /api/posts/feed - Get user's feed with pagination
router.get("/feed", async (req, res) => {
  try {
    const { userId, limit = 10, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    db = admin.firestore();
    const snapshot = await db
      .collection("posts")
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const posts = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));

    const serializedPosts = posts.map((post) =>
      serializeFirestoreData(post)
    );

    res.status(200).json({
      posts: serializedPosts,
      count: posts.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

// POST /api/posts/:postId/like - Like/unlike a post
router.post("/:postId/like", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    db = admin.firestore();
    const postDoc = await db.collection("posts").doc(postId).get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = postDoc.data();
    const likes = post.likes || [];

    // Check if user already liked
    const alreadyLiked = likes.some((like) => like.userId === userId);

    if (alreadyLiked) {
      // Unlike
      const updatedLikes = likes.filter((like) => like.userId !== userId);
      await db.collection("posts").doc(postId).update({
        likes: updatedLikes,
        updatedAt: new Date(),
      });

      res.status(200).json({ message: "Post unliked", liked: false });
    } else {
      // Like
      const newLike = {
        userId,
        createdAt: new Date(),
      };

      await db.collection("posts").doc(postId).update({
        likes: [...likes, newLike],
        updatedAt: new Date(),
      });

      res.status(200).json({ message: "Post liked", liked: true });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to like/unlike post" });
  }
});

// POST /api/posts/:postId/comment - Add a comment
router.post("/:postId/comment", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, text } = req.body;

    if (!userId || !text) {
      return res
        .status(400)
        .json({ error: "userId and text are required" });
    }

    db = admin.firestore();
    const postDoc = await db.collection("posts").doc(postId).get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = postDoc.data();
    const comments = post.comments || [];

    const newComment = {
      commentId: uuidv4(),
      userId,
      text,
      likes: [],
      createdAt: new Date(),
    };

    await db.collection("posts").doc(postId).update({
      comments: [...comments, newComment],
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "Comment added",
      comment: serializeFirestoreData(newComment),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// POST /api/posts/:postId/share - Share a post
router.post("/:postId/share", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, message } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    db = admin.firestore();
    const postDoc = await db.collection("posts").doc(postId).get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = postDoc.data();
    const shares = post.shares || [];

    const newShare = {
      userId,
      message: message || "",
      sharedAt: new Date(),
    };

    // Update the original post with the share record
    await db.collection("posts").doc(postId).update({
      shares: [...shares, newShare],
      updatedAt: new Date(),
    });

    // Create a shared post entry in a "sharedPosts" collection for easy retrieval
    const sharedPostRef = await db.collection("sharedPosts").add({
      originalPostId: postId,
      sharedBy: userId,
      message: message || "",
      sharedAt: new Date(),
    });

    res.status(200).json({
      message: "Post shared",
      share: serializeFirestoreData(newShare),
      sharedPostId: sharedPostRef.id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to share post" });
  }
});

// DELETE /api/posts/:postId - Delete a post
router.delete("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    db = admin.firestore();
    const postDoc = await db.collection("posts").doc(postId).get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = postDoc.data();

    // Check if user is the post owner
    if (post.userId !== userId) {
      return res
        .status(403)
        .json({ error: "You can only delete your own posts" });
    }

    await db.collection("posts").doc(postId).delete();

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// GET /api/posts/:postId - Get a specific post
router.get("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    db = admin.firestore();
    const postDoc = await db.collection("posts").doc(postId).get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = { _id: postDoc.id, ...postDoc.data() };
    const serializedPost = serializeFirestoreData(post);

    res.status(200).json(serializedPost);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

module.exports = router;
