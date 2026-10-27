import { AuthLoadingState } from "@/components/auth/loading-state";
export default function ResetPasswordLoading() {
  return (
    <AuthLoadingState
      label="Memuat pengaturan ulang kata sandi"
      variant="reset"
    />
  );
}
