import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control Horario — Tu jornada bajo control",
  description:
    "Aplicación de registro y gestión de jornada laboral. Controla tu tiempo de trabajo, pausas y obtén reportes detallados.",
  keywords: ["control horario", "fichaje", "jornada laboral", "time tracking"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
