const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

let db;

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
    const serialized = {};
    for (const key in obj) {
      serialized[key] = serializeFirestoreData(obj[key]);
    }
    return serialized;
  }

  return obj;
};

// POST /api/messages/send-content - Share content with specific users
router.post("/send-content", async (req, res) => {
  try {
    const { sharedBy, sharedWithIds, content, sharedMessage } = req.body;

    if (!sharedBy || !sharedBy.userId || !sharedWithIds || sharedWithIds.length === 0) {
      return res.status(400).json({
        error: "sharedBy with userId and sharedWithIds array are required",
      });
    }

    if (!content || !content.postId) {
      return res.status(400).json({ error: "content with postId is required" });
    }

    db = admin.firestore();

    // Verify that the shared user exists
    const sharedByUserDoc = await db.collection("users").doc(sharedBy.userId).get();
    if (!sharedByUserDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create a content interaction for each recipient
    const shareIds = [];
    const sharePromises = sharedWithIds.map(async (recipientId) => {
      try {
        // Verify recipient exists
        const recipientDoc = await db.collection("users").doc(recipientId).get();
        if (!recipientDoc.exists) {
          return null;
        }

        const recipientData = recipientDoc.data();
        const interactionId = uuidv4();

        const contentInteraction = {
          id: interactionId,
          sharedBy: {
            userId: sharedBy.userId,
            name: sharedBy.name || "User",
            email: sharedBy.email || "",
          },
          sharedWith: {
            userId: recipientId,
            name: recipientData.name || "User",
            email: recipientData.email || "",
          },
          content: {
            postId: content.postId,
            caption: content.caption || "",
            mediaUrls: content.mediaUrls || [],
            originalPoster: content.originalPoster || {
              userId: sharedBy.userId,
              name: sharedBy.name || "User",
            },
          },
          sharedMessage: sharedMessage || "",
          isRead: false,
          interactions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db
          .collection("contentInteractions")
          .doc(interactionId)
          .set(contentInteraction);

        shareIds.push(interactionId);
        return interactionId;
      } catch (error) {
        console.error("Error sharing with user:", error);
        return null;
      }
    });

    await Promise.all(sharePromises);

    res.status(200).json({
      message: "Content shared successfully",
      sharedWithCount: shareIds.length,
      shareIds,
    });
  } catch (error) {
    console.error("Error sharing content:", error);
    res.status(500).json({ error: "Failed to share content" });
  }
});

// GET /api/messages/inbox - Get shared content for a user
router.get("/inbox", async (req, res) => {
  try {
    const { userId, limit = 10, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    db = admin.firestore();

    // Get shared content for the user - query without orderBy first, then sort in memory
    const contentInteractions = await db
      .collection("contentInteractions")
      .where("sharedWith.userId", "==", userId)
      .get();

    // Sort in memory by createdAt descending
    const allInteractions = contentInteractions.docs
      .map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return timeB.getTime() - timeA.getTime();
      });

    // Apply offset and limit
    const paginatedInteractions = allInteractions.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    const serializedInteractions = paginatedInteractions.map((interaction) =>
      serializeFirestoreData(interaction)
    );

    res.status(200).json({
      interactions: serializedInteractions,
      count: paginatedInteractions.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: allInteractions.length,
    });
  } catch (error) {
    console.error("Error fetching inbox:", error);
    res.status(500).json({ error: "Failed to fetch shared content" });
  }
});

// GET /api/messages/sent - Get content shared by a user
router.get("/sent", async (req, res) => {
  try {
    const { userId, limit = 10, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    db = admin.firestore();

    // Get content shared by the user - query without orderBy first, then sort in memory
    const contentInteractions = await db
      .collection("contentInteractions")
      .where("sharedBy.userId", "==", userId)
      .get();

    // Sort in memory by createdAt descending
    const allInteractions = contentInteractions.docs
      .map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return timeB.getTime() - timeA.getTime();
      });

    // Apply offset and limit
    const paginatedInteractions = allInteractions.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    const serializedInteractions = paginatedInteractions.map((interaction) =>
      serializeFirestoreData(interaction)
    );

    res.status(200).json({
      interactions: serializedInteractions,
      count: paginatedInteractions.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: allInteractions.length,
    });
  } catch (error) {
    console.error("Error fetching sent shares:", error);
    res.status(500).json({ error: "Failed to fetch sent content" });
  }
});

// PATCH /api/messages/:interactionId/mark-read - Mark shared content as read
router.patch("/:interactionId/mark-read", async (req, res) => {
  try {
    const { interactionId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    db = admin.firestore();

    const interactionDoc = await db
      .collection("contentInteractions")
      .doc(interactionId)
      .get();

    if (!interactionDoc.exists) {
      return res.status(404).json({ error: "Interaction not found" });
    }

    const interaction = interactionDoc.data();

    // Verify user is the recipient
    if (interaction.sharedWith.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to mark this as read" });
    }

    // Update read status
    await db
      .collection("contentInteractions")
      .doc(interactionId)
      .update({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      });

    res.status(200).json({ message: "Marked as read" });
  } catch (error) {
    console.error("Error marking as read:", error);
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

// POST /api/messages/:interactionId/interact - Add interaction (like/comment) to shared content
router.post("/:interactionId/interact", async (req, res) => {
  try {
    const { interactionId } = req.params;
    const { userId, type, value } = req.body;

    if (!userId || !type) {
      return res.status(400).json({ error: "userId and type are required" });
    }

    if (type === "comment" && !value) {
      return res.status(400).json({ error: "value is required for comments" });
    }

    db = admin.firestore();

    const interactionDoc = await db
      .collection("contentInteractions")
      .doc(interactionId)
      .get();

    if (!interactionDoc.exists) {
      return res.status(404).json({ error: "Interaction not found" });
    }

    const interaction = interactionDoc.data();

    // Check for duplicate like
    if (type === "like") {
      const hasLiked = interaction.interactions?.some(
        (int) => int.type === "like" && int.userId === userId
      );
      if (hasLiked) {
        return res.status(400).json({ error: "Already liked this" });
      }
    }

    const newInteraction = {
      type,
      userId,
      value: value || "",
      createdAt: new Date(),
    };

    // Add interaction to the content
    const updatedInteractions = [...(interaction.interactions || []), newInteraction];

    await db
      .collection("contentInteractions")
      .doc(interactionId)
      .update({
        interactions: updatedInteractions,
        updatedAt: new Date(),
      });

    res.status(200).json({
      message: "Interaction added",
      interaction: serializeFirestoreData(newInteraction),
    });
  } catch (error) {
    console.error("Error adding interaction:", error);
    res.status(500).json({ error: "Failed to add interaction" });
  }
});

// DELETE /api/messages/:interactionId - Delete shared content interaction
router.delete("/:interactionId", async (req, res) => {
  try {
    const { interactionId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    db = admin.firestore();

    const interactionDoc = await db
      .collection("contentInteractions")
      .doc(interactionId)
      .get();

    if (!interactionDoc.exists) {
      return res.status(404).json({ error: "Interaction not found" });
    }

    const interaction = interactionDoc.data();

    // Verify user can delete (sender or recipient)
    if (
      interaction.sharedBy.userId !== userId &&
      interaction.sharedWith.userId !== userId
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this" });
    }

    await db
      .collection("contentInteractions")
      .doc(interactionId)
      .delete();

    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting interaction:", error);
    res.status(500).json({ error: "Failed to delete interaction" });
  }
});

// GET /api/messages/conversation/:otherUserId - Get conversation history with a user
router.get("/conversation/:otherUserId", async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { userId, limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    db = admin.firestore();

    // Get all content interactions involving both users
    const conversations = await db
      .collection("contentInteractions")
      .get();

    // Filter in memory for interactions between the two users
    const allInteractions = conversations.docs
      .map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }))
      .filter((interaction) => {
        const isFromUserToOther =
          interaction.sharedBy.userId === userId &&
          interaction.sharedWith.userId === otherUserId;
        const isFromOtherToUser =
          interaction.sharedBy.userId === otherUserId &&
          interaction.sharedWith.userId === userId;
        return isFromUserToOther || isFromOtherToUser;
      })
      .sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return timeB.getTime() - timeA.getTime();
      });

    // Apply offset and limit
    const paginatedInteractions = allInteractions.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    const serializedInteractions = paginatedInteractions.map((interaction) =>
      serializeFirestoreData(interaction)
    );

    res.status(200).json({
      interactions: serializedInteractions,
      count: paginatedInteractions.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: allInteractions.length,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

module.exports = router;
