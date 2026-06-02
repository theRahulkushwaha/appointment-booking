import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage, getSlots } from "../api/client";
import type { SMBConfig, Slot } from "../types";

export function useSlots(
  smbId: string,
  weekStart: Date,
  weekEnd: Date,
  config: SMBConfig | null
) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    try {
      const minStart = weekStart.toISOString();
      const maxEnd = weekEnd.toISOString();
      const data = await getSlots(smbId, minStart, maxEnd);
      setSlots(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [smbId, weekStart, weekEnd, config]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { slots, loading, error, refetch };
}
