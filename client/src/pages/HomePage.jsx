import { useEffect, useState } from 'react'
import { LogOut, MessageSquare, Heart, MessageCircle, Share2, Plus } from 'lucide-react'
import axios from 'axios'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('feed') // feed, messages, profile

  const api = axios.create({
    baseURL: 'http://localhost:5000',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  })

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    loadFeed()
  }, [])

  const loadFeed = async () => {
    try {
      const response = await api.get('/api/posts')
      setPosts(response.data.data)
    } catch (error) {
      console.error('Failed to load feed:', error)
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!newPost.trim()) return

    setLoading(true)
    try {
      await api.post('/api/posts', { content: newPost })
      setNewPost('')
      loadFeed()
    } catch (error) {
      console.error('Failed to create post:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (postId) => {
    try {
      await api.post(`/api/posts/${postId}/like`)
      loadFeed()
    } catch (error) {
      console.error('Failed to like:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Header */}
      <header className="bg-adc-dark text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-adc-indigo rounded-lg flex items-center justify-center">
                <span className="font-bold text-sm">UD</span>
              </div>
              <h1 className="text-xl font-bold">UpDown</h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-600 rounded-lg text-sm hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white shadow sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex">
            {[
              { id: 'feed', icon: '📰', label: 'Feed' },
              { id: 'messages', icon: '💬', label: 'Chat' },
              { id: 'profile', icon: '👤', label: 'Profile' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-adc-indigo text-adc-indigo font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 mt-4 max-w-2xl">
        {activeTab === 'feed' && (
          <>
            {/* Create Post */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-4">
              <form onSubmit={handleCreatePost}>
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's on your mind, Mustafa?"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-adc-indigo focus:border-transparent outline-none resize-none"
                  rows="3"
                />
                <div className="flex justify-between items-center mt-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
                  >
                    📷 Photo/Video
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newPost.trim()}
                    className="bg-adc-indigo text-white px-6 py-2 rounded-lg font-medium hover:bg-adc-indigo/90 transition disabled:opacity-50"
                  >
                    {loading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            </div>

            {/* Feed Posts */}
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-8 text-center">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Posts Yet</h3>
                  <p className="text-gray-500">Be the first to share something!</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post._id} className="bg-white rounded-xl shadow-md overflow-hidden">
                    {/* Author */}
                    <div className="p-4 flex items-center gap-3 border-b">
                      <div className="w-10 h-10 bg-gradient-to-br from-adc-indigo to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {post.authorId?.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {post.authorId?.fullName || 'Unknown'}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                      
                      {/* Images */}
                      {post.images?.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {post.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Post attachment ${idx + 1}`}
                              className="w-full h-40 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t flex items-center justify-between">
                      <div className="flex gap-6">
                        <button
                          onClick={() => handleLike(post._id)}
                          className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition"
                        >
                          <Heart className="w-5 h-5" />
                          <span className="text-sm">{post.likes?.length || 0}</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition">
                          <MessageCircle className="w-5 h-5" />
                          <span className="text-sm">{post.commentsCount || 0}</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition">
                          <Share2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <MessageSquare className="w-16 h-16 text-adc-indigo mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Chat Feature</h3>
            <p className="text-gray-500">Coming soon! Real-time messaging is being built.</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-adc-indigo to-purple-600 h-32"></div>
            <div className="px-6 pb-6">
              <div className="relative -mt-16 mb-4">
                <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-4xl font-bold text-adc-indigo">
                    {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{user.fullName}</h2>
              <p className="text-gray-500">{user.email}</p>
              <div className="mt-6 flex justify-around text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{posts.length}</div>
                  <div className="text-sm text-gray-500">Posts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-500">Followers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-500">Following</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
