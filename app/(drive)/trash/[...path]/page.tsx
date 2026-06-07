import { Suspense } from "react";

import { FileManager } from "@/components/file-manager/file-manager";
import { CenterLoading } from "@/components/page-state";
import { routePathToCloudreveUri } from "@/lib/file-uri";

export default function TrashPathPage({ params }: { params: { path?: string[] } }) {
  return (
    <Suspense fallback={<CenterLoading />}>
      <FileManager trash initialUri={routePathToCloudreveUri(params.path, "trash")} />
    </Suspense>
  );
}
