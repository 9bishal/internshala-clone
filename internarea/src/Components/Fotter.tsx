import { Facebook, Twitter, Instagram } from "lucide-react";
import { useSelector } from "react-redux";
import { selectLanguage } from "@/Feature/Userslice";
import { useTranslation } from "@/utils/i18n";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-12">
      <div className="container mx-auto px-6 text-center">
        <p className="text-sm text-gray-400">© Copyright 2025 InternArea. All Rights Reserved.</p>
      </div>
    </footer>
  );
}