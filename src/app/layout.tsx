import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Inter } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});



export const metadata: Metadata = {
  title: {
    default: 'Food Repo',
    template: '%s | Food Repo',
  },
  description: 'Food Repo — Food Ingredient Database.',
  keywords: ['food', 'recipes', 'meal planning', 'food repo', 'culinary', 'nutrition', 'database'],
  authors: [
    {
      name: 'Seyone Gunasingham',
      url: 'https://seyone22.github.io',
    },
  ],
  creator: 'Seyone Gunasingham',
  publisher: 'DSMH',
  applicationName: 'Food Repo',
  metadataBase: new URL('https://foodrepo.example.com'),
  referrer: 'origin-when-cross-origin',
  openGraph: {
    title: 'Food Repo',
    description: 'Food Repo — Food Ingredient Database.',
    url: 'https://foodrepo.example.com',
    siteName: 'Food Repo',
    images: [
      {
        url: 'https://foodrepo.example.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Food Repo site preview image',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Food Repo',
    description: 'Discover & share food-related content with Food Repo.',
    images: ['https://foodrepo.example.com/twitter-image.png'],
    site: '@FoodRepo',            // replace with your Twitter handle
    creator: '@FoodRepo',         // replace accordingly
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
