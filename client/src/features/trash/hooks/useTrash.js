import { useState, useEffect, useCallback } from "react";
import trashApi from "../api/trashApi";
import { useWebSocket } from "../../../hooks/useWebsocket";

export default function useTrash() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trashApi.fetchTrash();
      if (res.success) setItems(res.data || []);
      else return { success: false, error: res.error || "Failed to load trash" };
    } catch {
      return { success: false, error: "Could not connect to server" };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useWebSocket({
    isAdmin: true,
    onTrashRestored: ({ entityType, entityId }) => {
      setItems(prev => prev.filter(
        i => !(i.entity_type === entityType && i.entity_id === entityId)
      ));
    },
    onTrashDeleted: ({ trashLogId }) => {
      if (!trashLogId) return;
      setItems(prev => prev.filter(i => i.id !== trashLogId));
    },
    onTrashEmptied: ({ entityType }) => {
      if (entityType === "all") setItems([]);
      else setItems(prev => prev.filter(i => i.entity_type !== entityType));
    },
  });

  const restoreItem = async (item) => {
    try {
      const res = await trashApi.restoreTrashItem(item.id);
      if (res.success) {
        setItems(prev => prev.filter(i => i.id !== item.id));
      }
      return res;
    } catch {
      return { success: false, error: "Failed to connect to server" };
    }
  };

  const permanentlyDeleteItem = async (item) => {
    try {
      const res = await trashApi.permanentDeleteTrashItem(item.id);
      if (res.success) {
        setItems(prev => prev.filter(i => i.id !== item.id));
      }
      return res;
    } catch {
      return { success: false, error: "Failed to connect to server" };
    }
  };

  const permanentlyDeleteAll = async (filterType) => {
    try {
      const res = await trashApi.permanentDeleteAllTrash(filterType !== "all" ? filterType : null);
      if (res.success) {
        if (filterType === "all") setItems([]);
        else setItems(prev => prev.filter(i => i.entity_type !== filterType));
      }
      return res;
    } catch {
      return { success: false, error: "Failed to connect to server" };
    }
  };

  return { items, loading, setItems, restoreItem, permanentlyDeleteItem, permanentlyDeleteAll };
}
