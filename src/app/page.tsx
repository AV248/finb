import { FinbProvider } from '@/lib/FinbProvider';
import { InstallPrompt } from '@/components/InstallPrompt';

export default function Page() {
  return (
    <FinbProvider>
      <InstallPrompt />
    </FinbProvider>
  );
}
