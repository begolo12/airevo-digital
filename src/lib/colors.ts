/** Kelas Tailwind statis untuk warna yang disimpan sebagai string di data. */
export const swatchBg: Record<string, string> = {
  butter: "bg-butter",
  mint: "bg-mint",
  tomato: "bg-tomato/70",
  sky: "bg-sky",
  plum: "bg-plum",
  ink: "bg-ink",
};

export const swatchBorder: Record<string, string> = {
  butter: "border-butter-deep",
  mint: "border-mint-deep",
  tomato: "border-tomato/50",
  sky: "border-sky-deep",
  plum: "border-plum",
  ink: "border-ink",
};

export function swatch(color?: string): string {
  return swatchBg[color ?? "butter"] ?? swatchBg.butter;
}

export const colorOptions = [
  { value: "butter", label: "Mentega" },
  { value: "mint", label: "Mint" },
  { value: "sky", label: "Langit" },
  { value: "plum", label: "Plum" },
  { value: "tomato", label: "Tomat" },
] as const;
