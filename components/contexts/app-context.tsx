/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useUser } from "@/hooks/useUser";
import { UserContext } from "@/components/contexts/user-context";
import { User } from "@/types";

export default function AppContext({
  children,
  me: initialData,
}: {
  children: React.ReactNode;
  me?: {
    user: User | null;
    errCode: number | null;
  };
}) {
  const { user } = useUser(initialData);
  return (
    <UserContext value={{ user: user ?? undefined}}>
      {children}
    </UserContext>
  );
}
