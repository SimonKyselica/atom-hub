"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";

export function RetryButton() {
  return (
    <Button variant="primary" size="lg" onClick={() => location.reload()}>
      <RotateCcw size={16} /> Try again
    </Button>
  );
}
