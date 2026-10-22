"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetProfilePin, selectProfileAction } from "@/lib/data/actions";
import type { ActionResult } from "@/lib/data/types";
import { cx } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

type ProfileOption = {
  id: string;
  name: string;
  initial: string;
  color: string;
  roleLabel: string;
  hasPin: boolean;
};

const colorStyles: Record<string, string> = {
  butter: "bg-butter border-butter-deep text-ink",
  plum: "bg-plum/60 border-plum text-ink",
  sky: "bg-sky/60 border-sky-deep text-ink",
  mint: "bg-mint/60 border-mint-deep text-ink",
  tomato: "bg-tomato/15 border-tomato/40 text-tomato-ink",
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-emphasis bg-emphasis px-5 text-sm font-semibold text-on-emphasis transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Membuka…" : label}
    </button>
  );
}

/**
 * Pemilihan profil + PIN.
 *
 * Dua tahap dalam satu komponen: pilih profil (kartu), lalu masukkan PIN
 * (keypad numerik). Keypad dipakai karena PIN 4–6 angka dan sering dimasukkan
 * di ponsel.
 */
export function ProfilePicker({
  profiles,
  next,
}: {
  profiles: ProfileOption[];
  next: string;
}) {
  const [selected, setSelected] = useState<ProfileOption | null>(null);
  const [pin, setPin] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [state, formAction] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      (await selectProfileAction(formData)) ?? null,
    null as ActionResult | null,
  );

  function press(digit: string) {
    if (pin.length >= 6) return;
    setPin((current) => current + digit);
  }

  function backspace() {
    setPin((current) => current.slice(0, -1));
  }

  function reset() {
    setSelected(null);
    setPin("");
    setRecovering(false);
  }

  if (selected && recovering) {
    return (
      <PinRecovery profile={selected} onCancel={() => setRecovering(false)} />
    );
  }

  if (!selected) {
    return (
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => setSelected(profile)}
              className="group flex flex-col items-center gap-2 rounded-[14px] border border-line bg-card px-3 py-5 transition-all hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-[var(--shadow-note)]"
            >
              <span
                aria-hidden="true"
                className={cx(
                  "grid h-14 w-14 place-items-center rounded-[16px] border text-xl font-black",
                  colorStyles[profile.color] ?? colorStyles.butter,
                )}
              >
                {profile.initial}
              </span>
              <span className="text-sm font-bold">{profile.name}</span>
              <span className="text-xs text-muted">{profile.roleLabel}</span>
              <span className="mt-0.5 flex items-center gap-1 text-2xs font-semibold text-muted">
                <Icon name={profile.hasPin ? "target" : "check"} size={10} />
                {profile.hasPin ? "PIN" : "tanpa PIN"}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-base text-muted">
          Pilih profil untuk melanjutkan. Setiap profil punya PIN dan ruang data sendiri.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="profileId" value={selected.id} />
      <input type="hidden" name="pin" value={pin} />
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className={cx(
            "grid h-16 w-16 place-items-center rounded-[18px] border text-2xl font-black",
            colorStyles[selected.color] ?? colorStyles.butter,
          )}
        >
          {selected.initial}
        </span>
        <p className="mt-3 text-lg font-bold">{selected.name}</p>
        <p className="text-base text-muted">
          {selected.hasPin ? "Masukkan PIN" : "Profil ini tanpa PIN"}
        </p>

        {state && !state.ok ? (
          <p role="alert" className="mt-2 text-base font-semibold text-danger">
            {state.message}
          </p>
        ) : null}

        {selected.hasPin ? (
          <>
            <div className="mt-4 flex items-center gap-2" aria-hidden="true">
              {Array.from({ length: Math.max(pin.length, 4) }, (_, index) => (
                <span
                  key={index}
                  className={cx(
                    "h-2.5 w-2.5 rounded-full transition-colors",
                    index < pin.length ? "bg-ink" : "bg-line-strong",
                  )}
                />
              ))}
            </div>

            <div className="mt-5 grid w-full max-w-[15rem] grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => press(digit)}
                  className="h-12 rounded-[10px] border border-line-strong bg-card text-base font-bold transition-colors hover:bg-paper-deep active:scale-[0.97]"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={reset}
                className="h-12 rounded-[10px] border border-transparent text-sm font-semibold text-muted transition-colors hover:bg-paper-deep"
              >
                Ganti
              </button>
              <button
                type="button"
                onClick={() => press("0")}
                className="h-12 rounded-[10px] border border-line-strong bg-card text-base font-bold transition-colors hover:bg-paper-deep active:scale-[0.97]"
              >
                0
              </button>
              <button
                type="button"
                onClick={backspace}
                aria-label="Hapus satu angka"
                className="grid h-12 place-items-center rounded-[10px] border border-transparent text-muted transition-colors hover:bg-paper-deep"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          </>
        ) : null}

        <div className="mt-5 w-full max-w-[15rem]">
          <SubmitButton label={`Masuk sebagai ${selected.name}`} />
        </div>

        {selected.hasPin ? (
          <button
            type="button"
            onClick={() => setRecovering(true)}
            className="mt-3 text-xs font-semibold text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
          >
            Lupa PIN?
          </button>
        ) : null}

        {selected.hasPin ? (
          <p className="mt-3 text-xs text-muted">PIN demo: 1234</p>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Formulir pemulihan PIN.
 *
 * Muncul hanya setelah pengguna menyatakan lupa PIN. Meminta kata sandi akun,
 * bukan PIN lama — justru karena PIN lama itulah yang terlupakan.
 */
function PinRecovery({
  profile,
  onCancel,
}: {
  profile: ProfileOption;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      (await resetProfilePin(formData)) ?? null,
    null as ActionResult | null,
  );

  return (
    <form action={formAction} className="mx-auto mt-6 w-full max-w-sm">
      <input type="hidden" name="profileId" value={profile.id} />

      <p className="text-sm font-bold">Atur PIN baru untuk {profile.name}</p>
      <p className="mt-1 text-xs text-muted">
        Masukkan kata sandi akun Anda untuk memastikan ini memang Anda.
      </p>

      {state ? (
        <p
          role="alert"
          className={cx(
            "mt-3 rounded-[8px] px-3 py-2 text-xs font-semibold",
            state.ok ? "bg-mint/40 text-ink" : "bg-tomato/20 text-danger",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        <label className="block">
          <span className="text-xs font-semibold text-ink-soft">Kata sandi akun</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-[8px] border border-line-strong bg-card px-2.5 py-1.5 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-ink-soft">PIN baru (4–6 angka)</span>
          <input
            name="pin"
            type="password"
            required
            inputMode="numeric"
            pattern="\d{4,6}"
            maxLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded-[8px] border border-line-strong bg-card px-2.5 py-1.5 text-sm tnum"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-ink-soft">Ulangi PIN baru</span>
          <input
            name="confirmPin"
            type="password"
            required
            inputMode="numeric"
            pattern="\d{4,6}"
            maxLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded-[8px] border border-line-strong bg-card px-2.5 py-1.5 text-sm tnum"
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-[8px] border border-ink bg-ink px-3 py-2 text-xs font-bold text-paper transition-opacity hover:opacity-90"
        >
          Simpan PIN baru
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[8px] border border-line-strong px-3 py-2 text-xs font-semibold text-muted hover:bg-paper-deep"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
