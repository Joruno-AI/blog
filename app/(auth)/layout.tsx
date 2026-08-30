import { AppProviders } from "@/components/platform/app-providers";
import "../studio-global.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
