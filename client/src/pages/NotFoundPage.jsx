import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="h-screen bg-chat-bg text-white flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-6">Page not found</p>
      <Link to="/" className="bg-light-blue px-4 py-2 rounded-full">Go Home</Link>
    </div>
  );
};

export default NotFoundPage;
