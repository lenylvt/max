import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />
      <div className="pt-14">
        <Pricing />
      </div>
    </div>
  );
}
