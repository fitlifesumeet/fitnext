// pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/images/bg-photo.jpg')" }} // 👈 Place your photo in public/images/
    >
      {/* Dark overlay for readability */}
      <div className="bg-black bg-opacity-50 min-h-screen">
        <Component {...pageProps} />
      </div>
    </div>
  );
}
