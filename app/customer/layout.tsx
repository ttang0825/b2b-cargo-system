import CustomerPortalShell from "./CustomerPortalShell";

export const metadata = {
  title: "화주포털 | WeCarry 운송",
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CustomerPortalShell>{children}</CustomerPortalShell>;
}
