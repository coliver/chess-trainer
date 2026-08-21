import React from "react";

type Props = {
  title?: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
};

export function AuthCard({ title, subtitle, children }: Props) {
  return (
    <main className="page">
      <div className="card" style={{ maxWidth: 520, marginTop: 20 }}>
        {title && (
          <h1 className="title" style={{ marginBottom: 6 }}>
            {title}
          </h1>
        )}
        {subtitle && <p className="subtitle">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
