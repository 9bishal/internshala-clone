const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

let db;

// Configure SendGrid email service
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Supported languages (6 as per task: English, Spanish, Hindi, Portuguese, Chinese, French)
const SUPPORTED_LANGUAGES = {
  en: { name: "English", nativeName: "English", requiresOTP: false },
  es: { name: "Spanish", nativeName: "Español", requiresOTP: false },
  hi: { name: "Hindi", nativeName: "हिंदी", requiresOTP: false },
  pt: { name: "Portuguese", nativeName: "Português", requiresOTP: false },
  zh: { name: "Chinese", nativeName: "中文", requiresOTP: false },
  fr: { name: "French", nativeName: "Français", requiresOTP: true },
};

// Translations
const TRANSLATIONS = {
  en: {
    welcome: "Welcome to Internshala",
    hello: "Hello",
    internships: "Internships",
    jobs: "Jobs",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    search: "Search",
    apply: "Apply",
    home: "Home",
  },
  es: {
    welcome: "Bienvenido a Internshala",
    hello: "Hola",
    internships: "Pasantías",
    jobs: "Empleos",
    profile: "Perfil",
    settings: "Configuración",
    logout: "Cerrar sesión",
    search: "Buscar",
    apply: "Aplicar",
    home: "Inicio",
  },
  hi: {
    welcome: "इंटर्नशाला में स्वागत है",
    hello: "नमस्ते",
    internships: "इंटर्नशिप",
    jobs: "नौकरियां",
    profile: "प्रोफाइल",
    settings: "सेटिंग्स",
    logout: "लॉग आउट",
    search: "खोजें",
    apply: "आवेदन करें",
    home: "होम",
  },
  pt: {
    welcome: "Bem-vindo ao Internshala",
    hello: "Olá",
    internships: "Estágios",
    jobs: "Empregos",
    profile: "Perfil",
    settings: "Configurações",
    logout: "Sair",
    search: "Pesquisar",
    apply: "Aplicar",
    home: "Início",
  },
  zh: {
    welcome: "欢迎来到Internshala",
    hello: "你好",
    internships: "实习",
    jobs: "工作",
    profile: "个人资料",
    settings: "设置",
    logout: "退出",
    search: "搜索",
    apply: "申请",
    home: "首页",
  },
  fr: {
    welcome: "Bienvenue sur Internshala",
    hello: "Bonjour",
    internships: "Stages",
    jobs: "Emplois",
    profile: "Profil",
    settings: "Paramètres",
    logout: "Déconnexion",
    search: "Rechercher",
    apply: "Postuler",
    home: "Accueil",
  },
};

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email
async function sendOTPEmail(email, otp, language = "en") {
  try {
    const languageName =
      SUPPORTED_LANGUAGES[language]?.nativeName || "French";
    const subject =
      language === "fr"
        ? "Code de vérification de langue - Internshala"
        : "Language Verification Code - Internshala";

    const htmlContent =
      language === "fr"
        ? `
          <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #333; margin-bottom: 20px;">Changement de Langue</h2>
              <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                Vous avez demandé un changement de langue vers le français. Veuillez utiliser le code OTP ci-dessous:
              </p>
              <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
                <h1 style="color: #007bff; letter-spacing: 2px; margin: 0;">${otp}</h1>
              </div>
              <p style="color: #999; font-size: 14px;">
                Ce code expirera dans 10 minutes.
              </p>
            </div>
          </div>
        `
        : `
          <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #333; margin-bottom: 20px;">Language Change Verification</h2>
              <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                You requested to change your language preference to ${languageName}. Use the OTP below to verify:
              </p>
              <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
                <h1 style="color: #007bff; letter-spacing: 2px; margin: 0;">${otp}</h1>
              </div>
              <p style="color: #999; font-size: 14px;">
                This OTP will expire in 10 minutes.
              </p>
            </div>
          </div>
        `;

    const msg = {
      to: email,
      from: process.env.DEFAULT_FROM_EMAIL,
      subject,
      html: htmlContent,
    };
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    return false;
  }
}

// Get supported languages
router.get("/supported", async (req, res) => {
  try {
    const languages = Object.entries(SUPPORTED_LANGUAGES).map(
      ([code, lang]) => ({
        code,
        ...lang,
      })
    );

    res.status(200).json({ languages });
  } catch (error) {
    console.error("Error fetching languages:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's current language preference
router.get("/preference/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    db = admin.firestore();
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();
    const language = userData.language || "en";

    res.status(200).json({
      currentLanguage: language,
      languages: Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => ({
        code,
        ...lang,
      })),
    });
  } catch (error) {
    console.error("Error fetching preference:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Request language change OTP
router.post("/request-change", async (req, res) => {
  try {
    const { uid, email, language } = req.body;

    if (!uid || !email || !language) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!SUPPORTED_LANGUAGES[language]) {
      return res.status(400).json({ message: "Unsupported language" });
    }

    db = admin.firestore();

    // Check if OTP is required for this language
    if (!SUPPORTED_LANGUAGES[language].requiresOTP) {
      // Directly update language preference
      await db.collection("users").doc(uid).set({
        uid,
        email,
        language,
        languageChangedAt: new Date(),
      }, { merge: true });

      return res.status(200).json({
        message: `Language changed to ${SUPPORTED_LANGUAGES[language].nativeName}`,
        language,
      });
    }

    // Generate OTP for languages that require verification
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Firestore
    await db
      .collection("language_change_otp")
      .doc(uid)
      .set({
        otp,
        language,
        email,
        expiresAt,
        createdAt: new Date(),
        used: false,
      });

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp, language);

    if (emailSent) {
      res.status(200).json({
        message: `OTP sent to verify language change to ${SUPPORTED_LANGUAGES[language].nativeName}`,
        otpSentTo: email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
        language,
      });
    } else {
      res.status(500).json({ message: "Failed to send OTP" });
    }
  } catch (error) {
    console.error("Error in request-change:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify OTP and change language
router.post("/verify-change", async (req, res) => {
  try {
    const { uid, otp, language } = req.body;

    if (!uid || !otp || !language) {
      return res.status(400).json({ message: "All fields are required" });
    }

    db = admin.firestore();

    // Retrieve stored OTP
    const otpDoc = await db.collection("language_change_otp").doc(uid).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    const otpData = otpDoc.data();

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt.toDate()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check if OTP was already used
    if (otpData.used) {
      return res.status(400).json({ message: "OTP already used" });
    }

    // Update user's language preference
    await db.collection("users").doc(uid).update({
      language,
      languageChangedAt: new Date(),
    });

    // Mark OTP as used
    await db.collection("language_change_otp").doc(uid).update({
      used: true,
      usedAt: new Date(),
    });

    res.status(200).json({
      message: `Language changed to ${SUPPORTED_LANGUAGES[language].nativeName}`,
      language,
    });
  } catch (error) {
    console.error("Error in verify-change:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get translations for a specific language
router.get("/translations/:language", async (req, res) => {
  try {
    const { language } = req.params;

    if (!SUPPORTED_LANGUAGES[language]) {
      return res.status(400).json({ message: "Unsupported language" });
    }

    const translations = TRANSLATIONS[language] || TRANSLATIONS["en"];

    res.status(200).json({
      language,
      translations,
    });
  } catch (error) {
    console.error("Error fetching translations:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
