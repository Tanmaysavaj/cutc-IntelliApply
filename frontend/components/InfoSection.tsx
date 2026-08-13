'use client';

import Card from '@/components/Card';

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="icon" aria-hidden="true">
    {children}
  </span>
);

export default function InfoSection({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="info-section">
      <Icon>{icon}</Icon>
      <div>
        <h3>{title}</h3>
        {children}
      </div>
    </Card>
  );
}
