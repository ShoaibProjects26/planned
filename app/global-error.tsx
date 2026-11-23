"use client";

// Last-resort boundary for errors in the root layout itself.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-GB">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F7FAF7", margin: 0 }}>
        <div style={{ maxWidth: 380, margin: "15vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, color: "#1e4d36" }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#5b6b61" }}>
            Please try again. If it keeps happening, contact support.
            {error.digest && <span style={{ display: "block", marginTop: 8, fontSize: 12 }}>Reference: {error.digest}</span>}
          </p>
          <button
            onClick={reset}
            style={{ marginTop: 12, padding: "10px 20px", borderRadius: 10, border: 0, background: "#2f7a52", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
