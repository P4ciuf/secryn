import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MfaSection } from "@/features/settings/components/MfaSection";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class extends Error {
    status: number;
    data: unknown;
    constructor(status: number, message: string, data?: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  },
}));

import { api } from "@/lib/api";

const setupResponse = {
  secret: "JBSWY3DPEHPK3PXP",
  qrCode: "data:image/png;base64,QR_CODE",
  otpauthUrl: "otpauth://totp/Secryn:user@test.com?secret=JBSWY3DPEHPK3PXP",
};

const enabledStatus = { enabled: true };
const disabledStatus = { enabled: false };
const maskedCodes = { codes: ["****", "****", "****"] };

describe("<MfaSection />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the section heading", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(disabledStatus);
    render(<MfaSection />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Two-Factor Authentication" }),
      ).toBeInTheDocument();
    });
  });

  it("should show loading skeleton while fetching status", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    render(<MfaSection />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("should show setup button when MFA is not enabled", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(disabledStatus);
    render(<MfaSection />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /set up two-factor authentication/i }),
      ).toBeInTheDocument();
    });
  });

  it("should show QR code and OTP input after clicking setup", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValueOnce(disabledStatus).mockResolvedValueOnce(setupResponse);
    render(<MfaSection />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /set up two-factor authentication/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /set up two-factor authentication/i }));

    await waitFor(() => {
      expect(screen.getByText(setupResponse.secret)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /verify & enable/i })).toBeInTheDocument();
    });
  });

  it("should show enabled state when MFA is already enabled", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(enabledStatus);
    vi.mocked(api.get).mockResolvedValueOnce(maskedCodes);
    render(<MfaSection />);
    await waitFor(() => {
      expect(screen.getByText("Enabled")).toBeInTheDocument();
      expect(screen.getByText(/recovery codes are stored encrypted/i)).toBeInTheDocument();
    });
  });

  it("should call api.post to disable MFA and show success", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValueOnce(enabledStatus);
    vi.mocked(api.get).mockResolvedValueOnce(maskedCodes);
    vi.mocked(api.post).mockResolvedValueOnce({ ok: true });
    render(<MfaSection />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /disable two-factor authentication/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /disable two-factor authentication/i }));

    await waitFor(() => {
      expect(screen.getByText("Two-factor authentication disabled")).toBeInTheDocument();
    });
  });

  it("should show error when setup fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValueOnce(disabledStatus);
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Failed to initialize MFA setup"));
    render(<MfaSection />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /set up two-factor authentication/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /set up two-factor authentication/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to initialize MFA setup")).toBeInTheDocument();
    });
  });

  it("should call api.post to regenerate codes and show success", async () => {
    const user = userEvent.setup();
    const newCodes = { codes: ["f6e5d4c3b2a1", "e5d4c3b2a1f6"] };
    vi.mocked(api.get).mockResolvedValueOnce(enabledStatus);
    vi.mocked(api.get).mockResolvedValueOnce(maskedCodes);
    vi.mocked(api.post).mockResolvedValueOnce(newCodes);
    render(<MfaSection />);

    await waitFor(() => {
      expect(screen.getByTitle("Regenerate codes")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Regenerate codes"));

    await waitFor(() => {
      expect(screen.getByText("Recovery codes regenerated successfully")).toBeInTheDocument();
    });
  });

  it("should show cancel button in setup flow", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValueOnce(disabledStatus).mockResolvedValueOnce(setupResponse);
    render(<MfaSection />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /set up two-factor authentication/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /set up two-factor authentication/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /set up two-factor authentication/i }),
      ).toBeInTheDocument();
    });
  });
});
