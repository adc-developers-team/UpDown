import BottomNav from '../components/BottomNav';
const CallsPage = () => (
  <div className="min-h-screen bg-chat-bg text-white pb-20">
    <div className="flex items-center justify-center h-full pt-20"><div className="text-center text-text-muted"><p className="text-lg font-semibold">Calls</p><p className="text-sm">Call history will appear here</p></div></div>
    <BottomNav />
  </div>
);
export default CallsPage;
