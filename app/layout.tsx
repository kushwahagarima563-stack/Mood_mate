"use client";

import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Navbar from "./components/navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
    <html lang="en" className="h-full w-full">
      <body className="bg-gray-50 min-h-screen w-screen text-gray-900">
        <Navbar />
        <main className="flex-1 h-full w-screen mt-6">{children}</main>
      </body>
    </html>
    </ClerkProvider>
  );
}
