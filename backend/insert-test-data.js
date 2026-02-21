const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  clientId: process.env.FIREBASE_CLIENT_ID,
  authUri: "https://accounts.google.com/o/oauth2/auth",
  tokenUri: "https://oauth2.googleapis.com/token",
  authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
  clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.firestore();

const testJobs = [
  {
    title: "Frontend Developer",
    company: "Google",
    location: "San Francisco, CA",
    Experience: "2+ years",
    category: "Engineering",
    aboutCompany: "Google is a multinational technology company specializing in search, advertising, and cloud computing.",
    aboutJob: "We are looking for a talented Frontend Developer to build amazing user interfaces.",
    whoCanApply: "Developers with experience in React, JavaScript, and modern web technologies.",
    perks: "Competitive salary, Health insurance, Stock options, Free meals",
    AdditionalInfo: "This is a full-time position. Work from office with occasional remote flexibility.",
    CTC: "$120,000 - $160,000",
    StartDate: "2026-03-01",
    numberOfOpening: 3,
    createdAt: new Date(),
  },
  {
    title: "Senior Backend Developer",
    company: "Microsoft",
    location: "Seattle, WA",
    Experience: "5+ years",
    category: "Engineering",
    aboutCompany: "Microsoft is a leader in cloud computing and enterprise software solutions.",
    aboutJob: "Join our backend team to build scalable cloud services.",
    whoCanApply: "Senior developers with experience in Node.js, Python, or Java.",
    perks: "Excellent benefits, Professional development, Work-life balance",
    AdditionalInfo: "Hybrid work arrangement. 3 days in office, 2 days remote.",
    CTC: "$180,000 - $220,000",
    StartDate: "2026-02-15",
    numberOfOpening: 2,
    createdAt: new Date(),
  },
  {
    title: "Data Scientist",
    company: "Amazon",
    location: "Remote",
    Experience: "3+ years",
    category: "Data Science",
    aboutCompany: "Amazon is an e-commerce and cloud computing giant driving innovation globally.",
    aboutJob: "Build machine learning models that impact millions of customers.",
    whoCanApply: "Data scientists with strong Python and ML experience.",
    perks: "Competitive salary, Stock grants, Learning opportunities",
    AdditionalInfo: "Fully remote position. Work from anywhere.",
    CTC: "$150,000 - $190,000",
    StartDate: "2026-03-15",
    numberOfOpening: 4,
    createdAt: new Date(),
  },
  {
    title: "UI/UX Designer",
    company: "Apple",
    location: "Cupertino, CA",
    Experience: "2+ years",
    category: "Design",
    aboutCompany: "Apple creates innovative products that have revolutionized multiple industries.",
    aboutJob: "Design beautiful and intuitive user interfaces for our next-generation products.",
    whoCanApply: "Designers with Figma, Adobe XD experience and strong design fundamentals.",
    perks: "Premium work environment, Creative freedom, Top-tier benefits",
    AdditionalInfo: "Office-based position with access to cutting-edge tools.",
    CTC: "$110,000 - $150,000",
    StartDate: "2026-03-01",
    numberOfOpening: 2,
    createdAt: new Date(),
  },
  {
    title: "DevOps Engineer",
    company: "Netflix",
    location: "Los Gatos, CA",
    Experience: "3+ years",
    category: "Engineering",
    aboutCompany: "Netflix is a leading entertainment streaming platform.",
    aboutJob: "Build and maintain infrastructure for billions of users worldwide.",
    whoCanApply: "DevOps engineers with Kubernetes, Docker, and AWS experience.",
    perks: "High salary, Stock options, Flexible work hours",
    AdditionalInfo: "Hybrid arrangement with flexible location options.",
    CTC: "$160,000 - $200,000",
    StartDate: "2026-02-20",
    numberOfOpening: 3,
    createdAt: new Date(),
  }
];

const testInternships = [
  {
    title: "Frontend Development Intern",
    company: "Google",
    location: "Mountain View, CA",
    category: "Engineering",
    aboutCompany: "Google is a multinational technology company specializing in search and advertising.",
    aboutInternship: "Work on real frontend projects and learn from experienced engineers.",
    whoCanApply: "Students or recent graduates with basic JavaScript and React knowledge.",
    perks: "Stipend, Mentorship, Certificate of completion",
    numberOfOpening: 5,
    stipend: "₹50,000 - ₹75,000",
    startDate: "2026-04-01",
    additionalInfo: "3-month summer internship. On-site position.",
    createdAt: new Date(),
  },
  {
    title: "Backend Development Intern",
    company: "Microsoft",
    location: "Remote",
    category: "Engineering",
    aboutCompany: "Microsoft builds enterprise software and cloud solutions.",
    aboutInternship: "Build backend services and learn about cloud architecture.",
    whoCanApply: "Students with Python or Node.js experience.",
    perks: "Competitive stipend, Remote flexibility, Learn cutting-edge tech",
    numberOfOpening: 4,
    stipend: "₹60,000 - ₹80,000",
    startDate: "2026-05-01",
    additionalInfo: "6-month internship. Fully remote.",
    createdAt: new Date(),
  },
  {
    title: "Data Science Intern",
    company: "Amazon",
    location: "Seattle, WA",
    category: "Data Science",
    aboutCompany: "Amazon uses data to drive decisions across its business.",
    aboutInternship: "Work on ML models and data analysis projects.",
    whoCanApply: "Students with Python and basic ML knowledge.",
    perks: "Excellent stipend, Project exposure, Career guidance",
    numberOfOpening: 3,
    stipend: "₹70,000 - ₹90,000",
    startDate: "2026-06-01",
    additionalInfo: "4-month internship. Hybrid arrangement.",
    createdAt: new Date(),
  },
  {
    title: "UI/UX Design Intern",
    company: "Apple",
    location: "Cupertino, CA",
    category: "Design",
    aboutCompany: "Apple is known for its innovative and beautiful product design.",
    aboutInternship: "Design user interfaces for Apple's ecosystem.",
    whoCanApply: "Design students with Figma or Adobe XD experience.",
    perks: "Stipend, Design tools access, Industry mentorship",
    numberOfOpening: 2,
    stipend: "₹45,000 - ₹65,000",
    startDate: "2026-05-15",
    additionalInfo: "3-month internship. On-site position.",
    createdAt: new Date(),
  },
  {
    title: "Marketing Intern",
    company: "Netflix",
    location: "Remote",
    category: "Marketing",
    aboutCompany: "Netflix is a global entertainment platform.",
    aboutInternship: "Work on marketing campaigns and social media strategies.",
    whoCanApply: "Marketing students with social media and content creation skills.",
    perks: "Stipend, Flexible hours, Content creation experience",
    numberOfOpening: 3,
    stipend: "₹40,000 - ₹60,000",
    startDate: "2026-04-15",
    additionalInfo: "3-month internship. Fully remote.",
    createdAt: new Date(),
  }
];

async function insertTestData() {
  try {
    console.log('📝 Inserting test jobs...');
    let jobCount = 0;
    for (const job of testJobs) {
      await db.collection('jobs').add(job);
      jobCount++;
    }
    console.log(`✅ Successfully inserted ${jobCount} test jobs`);

    console.log('📝 Inserting test internships...');
    let internshipCount = 0;
    for (const internship of testInternships) {
      await db.collection('internships').add(internship);
      internshipCount++;
    }
    console.log(`✅ Successfully inserted ${internshipCount} test internships`);

    console.log('✅ All test data inserted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inserting test data:', error);
    process.exit(1);
  }
}

insertTestData();
