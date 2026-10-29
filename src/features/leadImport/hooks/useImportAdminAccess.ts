import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdmin } from "@/features/auth/types/auth.types";
import { authStorage } from "@/infrastructure/auth/tokenStorage";
import { LEADS_PATH } from "@/features/leadImport/utils/importRoutes";

export type ImportAccess = "checking" | "allowed" | "denied";

/** Only admins see import screens. Read once on mount so server and client markup match; others are sent to Leads. */
export function useImportAdminAccess(): ImportAccess {
  const router = useRouter();
  const [access, setAccess] = useState<ImportAccess>("checking");

  useEffect(() => {
    if (isAdmin(authStorage.getUser())) {
      setAccess("allowed");
    } else {
      setAccess("denied");
      router.replace(LEADS_PATH);
    }
  }, [router]);

  return access;
}
