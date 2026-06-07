"use client";

import * as React from "react";

export function useAsync<T>(factory: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [version, setVersion] = React.useState(0);

  const reload = React.useCallback(() => setVersion((value) => value + 1), []);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setData(null);

    factory()
      .then((result) => {
        if (mounted) {
          setData(result);
        }
      })
      .catch((nextError) => {
        if (mounted) {
          setError(nextError instanceof Error ? nextError : new Error("请求失败"));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return { data, error, loading, reload, setData };
}
