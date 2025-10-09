/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata, Viewport } from "next";
import { Inter, PT_Sans } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";

import "@/assets/globals.css";
import { Toaster } from "@/components/ui/sonner";
import MY_TOKEN_KEY from "@/lib/get-cookie-name";
import { apiServer } from "@/lib/api";
import IframeDetector from "@/components/iframe-detector";
import AppContext from "@/components/contexts/app-context";
import TanstackContext from "@/components/contexts/tanstack-query-context";
import { LoginProvider } from "@/components/contexts/login-context";
import { ProProvider } from "@/components/contexts/pro-context";
import { generateSEO, generateStructuredData } from "@/lib/seo";
import { auth, isAuthenticated } from "@/lib/my-auth";
import { User } from "@/types";
import { NextResponse } from "next/server";
import { listSpaces } from "@/lib/my-hub";

const inter = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const ptSans = PT_Sans({
  variable: "--font-ptSans-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  ...generateSEO({
    title: "DeepSite | Build with AI ✨",
    description:
      "DeepSite is a web development tool that helps you build websites with AI, no code required. Let's deploy your website with DeepSite and enjoy the magic of AI.",
    path: "/",
  }),
  appleWebApp: {
    capable: true,
    title: "DeepSite",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

async function getMe() {
  const user = await isAuthenticated();

  if (user instanceof NextResponse || !user) {
    return { user: null, projects: [], errCode: null };
  }

  const projects = [];
  for await (const space of listSpaces({
    search: {
      owner: user.name,
    }
  })) {
    projects.push(space);
  }

  return { user, projects, errCode: null };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = await getMe();

  // Generate structured data
  const structuredData = generateStructuredData("WebApplication", {
    name: "DeepSite",
    description: "Build websites with AI, no code required",
    url: "https://deepsite.hf.co",
  });

  const organizationData = generateStructuredData("Organization", {
    name: "DeepSite",
    url: "https://deepsite.hf.co",
  });

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationData),
          }}
        />
      </head>
      <Script
        defer
        data-domain="deepsite.hf.co"
        src="https://plausible.io/js/script.js"
      ></Script>
      <body
        className={`${inter.variable} ${ptSans.variable} antialiased bg-black dark h-[100dvh] overflow-hidden`}
      >
        <IframeDetector />
        <Toaster richColors position="bottom-center" />
        <TanstackContext>
          <AppContext me={data}>
            <LoginProvider>
              <ProProvider>{children}</ProProvider>
            </LoginProvider>
          </AppContext>
        </TanstackContext>
      </body>
    </html>
  );
}
