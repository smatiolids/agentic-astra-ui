import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agentic Tool Editor',
};

export default function AgenticToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
