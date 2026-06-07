import { NextResponse } from "next/server";

const DEFAULT_BASE = "http://localhost:5212/api/v4";

function getCloudreveRootUrl() {
  const base = (process.env.CLOUDREVE_API_BASE || DEFAULT_BASE).replace(/\/$/, "");
  const url = new URL(base);
  url.pathname = url.pathname.replace(/\/api\/v4\/?$/i, "") || "/";
  url.search = "";
  url.hash = "";
  return url;
}

export function GET() {
  const root = getCloudreveRootUrl();
  const dav = new URL(root.toString());
  dav.pathname = `${root.pathname.replace(/\/$/, "")}/dav/`.replace(/^\/\//, "/");

  return NextResponse.json({
    siteUrl: root.toString(),
    davUrl: dav.toString()
  });
}
