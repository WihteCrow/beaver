import '@xterm/xterm/css/xterm.css';
import './global.css';

export const metadata = {
  title: 'Welcome to arteffix-ai',
  description: 'Generated by create-nx-workspace',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}