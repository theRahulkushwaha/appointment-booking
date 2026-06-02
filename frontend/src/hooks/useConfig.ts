import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createConfig, getConfig, getErrorMessage, updateConfig as apiUpdateConfig } from "../api/client";
import type { SMBConfig, SMBConfigUpdatePayload } from "../types";

export function useConfig(smbId: string) {
  const [config, setConfig] = useState<SMBConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConfig(smbId);
      setConfig(data);
    } catch {
      try {
        const created = await createConfig();
        setConfig(created);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [smbId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const updateConfig = useCallback(
    async (payload: SMBConfigUpdatePayload) => {
      const updated = await apiUpdateConfig(smbId, payload);
      setConfig(updated);
      return updated;
    },
    [smbId]
  );

  return { config, loading, updateConfig, refetch };
}
