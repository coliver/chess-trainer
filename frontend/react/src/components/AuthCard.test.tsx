// src/components/AuthCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthCard } from "./AuthCard";

describe("AuthCard", () => {
  it("renders title, subtitle, and children", () => {
    render(
      <AuthCard title="Sign in" subtitle="Welcome back">
        <p>content</p>
      </AuthCard>,
    );

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("omits the heading and subtitle when not provided", () => {
    render(
      <AuthCard>
        <p>content</p>
      </AuthCard>,
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
