import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import UserPreferencesAppearance from '../../../components/UserPreferencesAppearance';
import '../../../components/UserPreferencesAppearance.css';

export default async function SettingsPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="container py-4">
      <h1 className="mb-4">Settings</h1>
      <UserPreferencesAppearance />
    </div>
  );
}
