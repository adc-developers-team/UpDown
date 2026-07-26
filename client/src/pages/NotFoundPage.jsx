import { Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const NotFoundPage = () => (
  <div className="min-h-screen bg-chat-bg text-primary flex flex-col items-center justify-center pb-20 pb-20">
    <h1 className="text-6xl font-bold mb-4">404</h1>
    <p className="text-xl mb-6">Page not found</p>
    <Link to="/" className="bg-primary text-primary px-6 py-2 rounded-full font-medium">Go Home</Link>
    <BottomNav />
  </div>
);
  <BottomNav />
export default NotFoundPage;
