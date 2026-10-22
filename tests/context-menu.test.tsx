// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

const success = vi.fn();
const error = vi.fn();
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ success, error, info: vi.fn(), toast: vi.fn(), dismiss: vi.fn() }),
}));

const confirmMock = vi.fn(async () => true);
vi.mock("@/components/ui/confirm", () => ({
  useConfirm: () => confirmMock,
}));

const { ContextMenu } = await import("@/components/app/context-menu");

const voidAction = vi.fn(async (formData: FormData) => {
  void formData;
  return { ok: true, message: "Dibatalkan" };
});

function renderMenu(overrides: Partial<Parameters<typeof ContextMenu>[0]> = {}) {
  return render(
    <table>
      <tbody>
        <ContextMenu
          as="tr"
          className="row"
          items={[
            { kind: "label", text: "Proyek freelance" },
            { kind: "copy", label: "Salin nominal", value: "Rp3.200.000" },
            { kind: "separator" },
            {
              kind: "action",
              label: "Batalkan transaksi",
              action: voidAction,
              fields: { id: "tx-1" },
              danger: true,
              confirm: "Batalkan transaksi ini?",
            },
          ]}
          {...overrides}
        >
          <td>Proyek freelance</td>
        </ContextMenu>
      </tbody>
    </table>,
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ContextMenu", () => {
  it("merender elemen <tr> langsung di dalam <tbody>", () => {
    const { container } = renderMenu();
    const row = container.querySelector("tbody > tr");
    expect(row).not.toBeNull();
    // Tidak boleh ada pembungkus tambahan: <div> di dalam <tbody> tidak valid.
    expect(container.querySelector("tbody > div")).toBeNull();
  });

  it("menu tersembunyi sebelum klik kanan", () => {
    renderMenu();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("klik kanan membuka menu berisi item", async () => {
    const { container } = renderMenu();
    fireEvent.contextMenu(container.querySelector("tbody > tr")!);

    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    expect(screen.getByText("Salin nominal")).toBeInTheDocument();
    expect(screen.getByText("Batalkan transaksi")).toBeInTheDocument();
  });

  it("Escape menutup menu", async () => {
    const { container } = renderMenu();
    fireEvent.contextMenu(container.querySelector("tbody > tr")!);
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("menyalin nilai ke clipboard dan memberi notifikasi", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { container } = renderMenu();
    fireEvent.contextMenu(container.querySelector("tbody > tr")!);
    await waitFor(() => expect(screen.getByText("Salin nominal")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Salin nominal"));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("Rp3.200.000"));
    expect(success).toHaveBeenCalled();
  });

  it("aksi berbahaya meminta konfirmasi lebih dulu", async () => {
    const { container } = renderMenu();
    fireEvent.contextMenu(container.querySelector("tbody > tr")!);
    await waitFor(() =>
      expect(screen.getByText("Batalkan transaksi")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Batalkan transaksi"));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Batalkan transaksi ini?", tone: "danger" }),
    );
    await waitFor(() => expect(voidAction).toHaveBeenCalled());
  });

  it("tidak menjalankan aksi bila konfirmasi ditolak", async () => {
    confirmMock.mockResolvedValueOnce(false);
    const { container } = renderMenu();
    fireEvent.contextMenu(container.querySelector("tbody > tr")!);
    await waitFor(() =>
      expect(screen.getByText("Batalkan transaksi")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Batalkan transaksi"));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(voidAction).not.toHaveBeenCalled();
  });

  it("mengirim fields sebagai FormData ke server action", async () => {
    const { container } = renderMenu();
    fireEvent.contextMenu(container.querySelector("tbody > tr")!);
    await waitFor(() =>
      expect(screen.getByText("Batalkan transaksi")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Batalkan transaksi"));

    await waitFor(() => expect(voidAction).toHaveBeenCalled());
    const formData = voidAction.mock.calls[0]![0];
    expect(formData.get("id")).toBe("tx-1");
  });

  it("tidak membuka menu saat disabled", () => {
    const { container } = renderMenu({ disabled: true });
    fireEvent.contextMenu(container.querySelector("tbody > tr")!);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
