import { useEffect, useState } from "react";

/**
 * Loads a list from Better Auth. Unlike a Convex query this is a plain fetch
 * with no subscription behind it, so nothing refreshes on its own — `reload()`
 * is how a create or delete pulls the new list.
 *
 * `load` must be defined at module scope, or every render would refetch.
 */
export function useRemoteList<T>(load: () => Promise<{ data?: T[] | null }>) {
  const [items, setItems] = useState<T[]>([]);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let live = true;
    void load().then(({ data }) => {
      if (live) setItems(data ?? []);
    });
    return () => {
      live = false;
    };
  }, [load, reloads]);

  return { items, reload: () => setReloads((n) => n + 1) };
}
