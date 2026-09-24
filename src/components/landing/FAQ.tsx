"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { serializeJsonLd } from "@/lib/structured-data";

export const FAQ_ITEMS = [
  {
    question: "What is Menuor?",
    answer:
      "Menuor is a restaurant management system built around a QR-code digital menu. Beyond the menu itself, it covers table ordering, a live kitchen order board, a waiter call button, staff accounts, expense tracking, and sales analytics — everything a restaurant needs to run day-to-day, in one place.",
  },
  {
    question: "Is Menuor a full restaurant management system, or just a digital menu?",
    answer:
      "Both. The digital menu is what customers see, but behind it Menuor gives owners an order management dashboard, staff roles and permissions, expense logging, and analytics — the same jobs a restaurant management system or point-of-sale software handles, without needing separate tools.",
  },
  {
    question: "Do customers need to download an app?",
    answer:
      "No. Customers scan the QR code on their table with their phone's camera and the menu opens instantly in their browser — no app to install.",
  },
  {
    question: "Can staff manage orders and tables from Menuor?",
    answer:
      "Yes. Waiters, cooks, and chefs can be added as staff accounts with their own logins. Orders move through a kanban-style board from New to Preparing to Served to Paid, and waiter calls come in as live notifications.",
  },
  {
    question: "How much does Menuor cost?",
    answer:
      "Menuor is free to start, with no credit card required. You can go live with a working digital menu and QR code in under 5 minutes.",
  },
  {
    question: "What is weather-adaptive or mood-based menu theming?",
    answer:
      "Menuor can automatically change your menu's theme and featured items based on real-time weather and time of day — for example, featuring hot drinks and a warm color scheme on a rainy evening, or cold drinks and bright colors on a sunny afternoon.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Frequently asked <span className="gradient-text">questions</span>
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto">
          Everything restaurant owners ask before switching to a digital menu and management system.
        </p>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.question} className="surface-card overflow-hidden">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 text-left"
              >
                <span className="font-semibold text-gray-900">{item.question}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <p className="px-5 pb-4 sm:px-6 sm:pb-5 text-gray-500 leading-relaxed">{item.answer}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
