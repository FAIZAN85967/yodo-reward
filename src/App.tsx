import AdminPage from '@/components/admin/AdminPage';
import PlayerApp from '@/components/PlayerApp';

export default function App() {
  if (window.location.pathname.replace(/\/+$/, '') === '/admin') {
    return <AdminPage />;
  }
  return <PlayerApp />;
}
