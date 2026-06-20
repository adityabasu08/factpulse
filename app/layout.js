import { Inter, Quicksand } from 'next/font/google';
import './globals.css';

// Configure Inter and Quicksand fonts
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const quicksand = Quicksand({
  subsets: ['latin'],
  variable: '--font-quicksand',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: 'FactPulse - Uncover the Truth in Every Claim',
  description: 'AI-powered fact verification. We analyze 1,000+ clinical and scientific sources to provide instant, evidence-based clarity on food safety rumors.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${quicksand.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        {/* Load Material Symbols Outlined */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
