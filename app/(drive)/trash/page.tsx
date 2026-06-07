import { Suspense } from "react";

import { FileManager } from "@/components/file-manager/file-manager";
import { CenterLoading } from "@/components/page-state";

export default function TrashPage() {
  return (
    <Suspense fallback={<CenterLoading />}>
      <FileManager trash />
    </Suspense>
  );
}
