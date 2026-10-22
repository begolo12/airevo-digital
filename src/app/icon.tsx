import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F6E7B4",
          color: "#23201D",
          fontSize: 22,
          fontWeight: 900,
          borderRadius: 7,
        }}
      >
        A
      </div>
    ),
    size,
  );
}
