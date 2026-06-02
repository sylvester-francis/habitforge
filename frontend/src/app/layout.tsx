import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "HabitForge",
    description: "Forge daily and weekly habits, one streak at a time.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-ember to-transparent opacity-60" />
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
