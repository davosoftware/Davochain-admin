import { LoginForm } from '@/components/login-form';

/**
 * A server component purely so the sign-out reason is server-rendered — being
 * told why you are back at the login screen should not wait for JavaScript.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; invited?: string }>;
}) {
  const { reason, invited } = await searchParams;
  return <LoginForm reason={reason} invited={invited} />;
}
