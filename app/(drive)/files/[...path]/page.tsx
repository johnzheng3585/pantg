import { Suspense } from "react";

import { FileManager } from "@/components/file-manager/file-manager";
import { CenterLoading } from "@/components/page-state";
import { routePathToCloudreveUri } from "@/lib/file-uri";

export default function FilesPathPage({ params }: { params: { path?: string[] } }) {
  return (
    <Suspense fallback={<CenterLoading />}>
      <FileManager initialUri={routePathToCloudreveUri(params.path, "my")} />
    </Suspense>
  );
}
