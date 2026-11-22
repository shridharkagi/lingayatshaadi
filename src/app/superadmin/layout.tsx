import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./admin.css";
import AdminShell from "@/components/superadmin/AdminShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Admin · LingayatBandhu",
  robots: { index: false, follow: false },
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={inter.variable}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
