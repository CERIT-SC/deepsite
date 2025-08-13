/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { User } from "@/types";
import { toast } from "sonner";

export const useUser = (initialData?: {
  user: User | null;
  errCode: number | null;
}) => {
  const client = useQueryClient();
  const router = useRouter();

  const { data: { user, errCode } = { user: null, errCode: null }, isLoading } =
    useQuery({
      queryKey: ["user.me"],
      queryFn: async () => {
        return { user: initialData?.user, errCode: initialData?.errCode };
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: false,
      initialData: initialData
        ? { user: initialData?.user, errCode: initialData?.errCode }
        : undefined,
      enabled: false,
    });

  const { data: loadingAuth } = useQuery({
    queryKey: ["loadingAuth"],
    queryFn: async () => false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const openLoginWindow = async () => {
    return router.push("/auth");
  };

  const logout = async () => {
    router.push("/");
    toast.success("Logout successful");
    client.setQueryData(["user.me"], {
      user: null,
      errCode: null,
    });
    window.location.reload();
  };

  return {
    user,
    errCode,
    loading: isLoading || loadingAuth,
    openLoginWindow,
    logout,
  };
};
