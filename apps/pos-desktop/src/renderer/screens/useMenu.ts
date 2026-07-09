import { useEffect, useState } from "react";
import type { MenuCategory, MenuItem } from "@pos/shared";
import { api } from "../posClient";

// Load the cached menu immediately (works offline), then refresh from the API
// in the background when reachable and update the cache for next launch.
export function useMenu() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    window.pos.getCachedMenu().then((cached) => {
      if (!active) return;
      setCategories(cached.categories);
      setItems(cached.items);
      setLoading(false);
    });

    Promise.all([api.menu.listCategories(), api.menu.listItems()])
      .then(([cats, its]) => {
        if (!active) return;
        setCategories(cats);
        setItems(its);
        setLoading(false);
        window.pos.setCachedMenu({ categories: cats, items: its });
      })
      .catch(() => {
        /* offline — cached data already shown */
      });

    return () => {
      active = false;
    };
  }, []);

  return { categories, items, loading };
}
