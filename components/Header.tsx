'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const navItems = [
  { label: 'Tools', href: '/tools' },
  { label: 'Agentic Tool', href: '/agentic-tool' },
  { label: 'Prompts', href: '/prompts' },
  { label: 'Resources', href: '/resources' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-6 text-sm font-medium text-gray-700 dark:text-gray-200">
        <img
          src="/assets/agentic-logo-light.png"
          alt="Agentic"
          className="h-7 w-auto"
        />
        <span className="text-gray-900 dark:text-white">Agentic Astra</span>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors ${
                isActive
                  ? 'text-gray-900 dark:text-white'
                  : 'hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <ThemeToggle />
    </header>
  );
}
