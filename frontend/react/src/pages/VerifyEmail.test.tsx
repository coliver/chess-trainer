// src/pages/VerifyEmail.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import VerifyEmail from "./VerifyEmail";
import api from "../api";

vi.mock("../api", () => ({
  default: { get: vi.fn() },
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <VerifyEmail />
    </MemoryRouter>,
  );
}

describe("VerifyEmail", () => {
  beforeEach(() => {
    (api.get as ReturnType<typeof vi.fn>).mockReset();
  });

  it("shows an error immediately when there is no token", async () => {
    renderAt("/verify-email");

    expect(
      await screen.findByText("This verification link is invalid or expired."),
    ).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("verifies the token and shows success with the returned email", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { email: "a@b.com" },
    });

    renderAt("/verify-email?token=abc123");

    expect(
      await screen.findByText("a@b.com has been verified! You can now log in."),
    ).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/auth/verify-email", {
      params: { token: "abc123" },
    });
    expect(
      screen.getByRole("link", { name: "Go to Login" }),
    ).toBeInTheDocument();
  });

  it("shows an error when verification fails", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("nope"));

    renderAt("/verify-email?token=bad");

    expect(
      await screen.findByText("This verification link is invalid or expired."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to Login" }),
    ).toBeInTheDocument();
  });
});
