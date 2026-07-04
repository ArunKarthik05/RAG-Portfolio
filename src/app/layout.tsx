import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Arun Karthik — AI Portfolio",
  description:
    "Ask anything about Arun Karthik. Powered by a RAG model trained on his GitHub, LinkedIn, calendar, and resume.",
  openGraph: {
    title: "Arun Karthik — AI Portfolio",
    description: "An AI assistant that knows Arun's work, projects, and availability.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
