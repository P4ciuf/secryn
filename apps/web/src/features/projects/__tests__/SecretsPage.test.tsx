import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import SecretsPage from "../SecretsPage";
import { api } from "../../../lib/api";
import type { Secret, ProjectSecretsData } from "@repo/shared";

vi.mock("../../../lib/api");

function renderWithRouter(projectId = "1") {
  return render(
    <MemoryRouter initialEntries={[`/projects/${projectId}/secrets`]}>
      <Routes>
        <Route path="/projects/:projectId/secrets" element={<SecretsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const mockSecret1: Secret = {
  id: "s1",
  name: "DISCORD_TOKEN",
  value: "discord-secret-value",
  updatedAt: "2026-06-01",
};

const mockSecret2: Secret = {
  id: "s2",
  name: "STRIPE_KEY",
  value: "stripe-secret-value",
  updatedAt: "2026-05-30",
};

const mockSecretsData: ProjectSecretsData = {
  name: "Production App",
  secrets: [mockSecret1, mockSecret2],
};

describe("SecretsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton while fetching secrets", () => {
    vi.mocked(api.get).mockReturnValue(new Promise<ProjectSecretsData>(() => {}));
    renderWithRouter();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows error message when fetching secrets fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network error"));
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("renders secrets table with data when API returns secrets", async () => {
    vi.mocked(api.get).mockResolvedValue(mockSecretsData);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Production App Secrets")).toBeInTheDocument();
    });
    expect(screen.getByText("DISCORD_TOKEN")).toBeInTheDocument();
    expect(screen.getByText("STRIPE_KEY")).toBeInTheDocument();
  });

  it("opens add secret modal, fills form, submits, and calls api.post", async () => {
    vi.mocked(api.get).mockResolvedValue(mockSecretsData);
    const createdSecret: Secret = {
      id: "s3",
      name: "NEW_KEY",
      value: "new-secret-value",
      updatedAt: "2026-06-03",
    };
    vi.mocked(api.post).mockResolvedValue(createdSecret);

    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Secret" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Add Secret" }));

    expect(screen.getByText("Add New Secret")).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("API_KEY"), {
        target: { value: "NEW_KEY" },
      });
      fireEvent.change(screen.getByPlaceholderText("your-secret-value-here"), {
        target: { value: "new-secret-value" },
      });
    });

    const submitButtons = screen.getAllByRole("button", { name: "Add Secret" });
    await user.click(submitButtons[1]);

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/projects/1/secrets", {
        name: "NEW_KEY",
        value: "new-secret-value",
      });
    });

    await waitFor(() => {
      expect(screen.queryByText("Add New Secret")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("NEW_KEY")).toBeInTheDocument();
    });
  });

  it("deletes a secret when delete button is clicked", async () => {
    vi.mocked(api.get).mockResolvedValue(mockSecretsData);
    vi.mocked(api.delete).mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("DISCORD_TOKEN")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/secrets/s1");
    });

    await waitFor(() => {
      expect(screen.queryByText("DISCORD_TOKEN")).not.toBeInTheDocument();
    });
  });

  it("toggles secret value visibility when show/hide button is clicked", async () => {
    vi.mocked(api.get).mockResolvedValue(mockSecretsData);

    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("DISCORD_TOKEN")).toBeInTheDocument();
    });

    const showButtons = screen.getAllByTitle("Show");
    expect(showButtons.length).toBeGreaterThan(0);

    expect(screen.queryByText("discord-secret-value")).not.toBeInTheDocument();

    await user.click(showButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("discord-secret-value")).toBeInTheDocument();
    });

    const hideButtons = screen.getAllByTitle("Hide");
    expect(hideButtons).toHaveLength(1);

    await user.click(hideButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("discord-secret-value")).not.toBeInTheDocument();
    });
  });

  it("closes the add secret modal when Cancel is clicked", async () => {
    vi.mocked(api.get).mockResolvedValue(mockSecretsData);

    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Secret" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Add Secret" }));

    expect(screen.getByText("Add New Secret")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Add New Secret")).not.toBeInTheDocument();
    });

    expect(vi.mocked(api.post)).not.toHaveBeenCalled();
  });

  it("shows error when add secret fails", async () => {
    vi.mocked(api.get).mockResolvedValue(mockSecretsData);
    vi.mocked(api.post).mockRejectedValue(new Error("Creation failed"));

    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Secret" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Add Secret" }));

    expect(screen.getByText("Add New Secret")).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("API_KEY"), {
        target: { value: "FAIL_KEY" },
      });
    });

    const form = document.querySelector("form");
    expect(form).not.toBeNull();

    await act(async () => {
      fireEvent.submit(form!);
    });

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("Creation failed")).toBeInTheDocument();
    });
  });

  it("shows error when delete secret fails", async () => {
    vi.mocked(api.get).mockResolvedValue(mockSecretsData);
    vi.mocked(api.delete).mockRejectedValue(new Error("Delete failed"));

    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("DISCORD_TOKEN")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete failed")).toBeInTheDocument();
    });
  });

  it("shows default project title when project name is empty", async () => {
    vi.mocked(api.get).mockResolvedValue({
      name: "",
      secrets: [],
    });
    renderWithRouter("999");
    await waitFor(() => {
      expect(screen.getByText("Project Secrets")).toBeInTheDocument();
    });
  });
});
