import { notFound } from "next/navigation";
import EscenarioDevClient from "@/components/escenario/EscenarioDevClient";

export default function DevEscenarioPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <EscenarioDevClient />;
}

