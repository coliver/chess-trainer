// src/pages/Login.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

import Login from "./Login";
import api from "../api";
import { login } from "../auth";

vi.mock("../api", () => ({
  default: { post: vi.fn() },
}));

vi.mock("../auth", () => ({
  login: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Username"), "alice");
  await user.type(screen.getByLabelText("Password"), "hunter2");
  await user.click(screen.getByRole("button", { name: "Submit" }));
}

describe("Login", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    (api.post as ReturnType<typeof vi.fn>).mockReset();
    (login as ReturnType<typeof vi.fn>).mockReset();
  });

  it("logs in and navigates to the dashboard on success", async () => {
    const data = {
      access_token: "t",
      refresh_token: "r",
      id: 1,
      username: "alice",
      email: "a@b.com",
    };
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data });
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/auth/login", {
        username: "alice",
        password: "hunter2",
      }),
    );
    expect(login).toHaveBeenCalledWith(data);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("shows the email-not-verified message and a resend button on a 403", async () => {
    const axiosError = Object.assign(new Error("forbidden"), {
      isAxiosError: true,
      response: { status: 403, data: { detail: "Email not verified" } },
    });
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(axiosError);
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    expect(
      await screen.findByText("Please verify your email before logging in"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resend verification email" }),
    ).toBeInTheDocument();
    vi.mocked(axios.isAxiosError).mockRestore();
  });

  it("shows a generic error message for other failures", async () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);

    expect(
      await screen.findByText("An unexpected error occurred."),
    ).toBeInTheDocument();
    vi.mocked(axios.isAxiosError).mockRestore();
  });

  it("resends the verification email and shows a confirmation", async () => {
    const axiosError = Object.assign(new Error("forbidden"), {
      isAxiosError: true,
      response: { status: 403, data: { detail: "Email not verified" } },
    });
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    (api.post as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(axiosError)
      .mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderLogin();

    await fillAndSubmit(user);
    await screen.findByRole("button", { name: "Resend verification email" });

    await user.click(
      screen.getByRole("button", { name: "Resend verification email" }),
    );

    expect(api.post).toHaveBeenCalledWith("/auth/resend-verification", {
      username: "alice",
    });
    expect(await screen.findByText("Sent!")).toBeInTheDocument();
    vi.mocked(axios.isAxiosError).mockRestore();
  });
});
