// src/pages/Register.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import Register from "./Register";
import api from "../api";

vi.mock("../api", () => ({
  default: { post: vi.fn() },
}));

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );
}

describe("Register", () => {
  beforeEach(() => {
    (api.post as ReturnType<typeof vi.fn>).mockReset();
  });

  it("shows a mismatch error and does not submit when passwords differ", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/^Email/), "a@b.com");
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.type(screen.getByLabelText("Confirm password"), "hunter3");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(
      await screen.findByText("Passwords do not match"),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("submits and shows the success message with the entered email", async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/^Email/), "a@b.com");
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.type(screen.getByLabelText("Confirm password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/auth/register",
        expect.objectContaining({
          email: "a@b.com",
          username: "alice",
          password: "hunter2",
        }),
      ),
    );

    expect(await screen.findByText(/a@b.com/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to login" }),
    ).toBeInTheDocument();
  });

  it("shows the generic error message when registration fails", async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("nope"));
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/^Email/), "a@b.com");
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.type(screen.getByLabelText("Confirm password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(
      await screen.findByText("Failed to register. Please try again later."),
    ).toBeInTheDocument();
  });
});
