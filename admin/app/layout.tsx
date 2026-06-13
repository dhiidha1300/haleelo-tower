import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Haleelo Tower - Admin Dashboard',
  description: 'Building management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={poppins.variable}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
