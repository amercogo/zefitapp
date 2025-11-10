// ⬅️ DODAJ OVO NA VRH
import "./globals.css";

export const metadata = { title: "ZeFit", description: "ZeFit admin" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="bs">
        {/* možeš dodati className ako želiš npr. antialiased */}
        <body>{children}</body>
        </html>
    );
}
