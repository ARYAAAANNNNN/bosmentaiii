import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { menuAPI, getImageUrl } from '../services/api'
import { useCart } from '../context/CartContext'
import Keranjang from '../components/Keranjang'
import MenuCard from '../components/MenuCard'
import './MenuPage.css'

function MenuPage() {
  const { tableId } = useParams()
  const { addToCart, getTotalItems } = useCart()
  const [activeCategory, setActiveCategory] = useState('semua')
  const [searchTerm, setSearchTerm] = useState('')
  const [menuItems, setMenuItems] = useState([])
  const [notification, setNotification] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchMenus = async () => {
      try {
        const response = await menuAPI.getAll()
        const items = response?.data || response
        if (mounted && Array.isArray(items)) {
          setMenuItems(items)
        }
      } catch (error) {
        console.error('Gagal mengambil menu dari backend:', error)
        if (mounted) setNotification('Gagal terhubung ke backend menu')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchMenus()
    return () => { mounted = false }
  }, [])

  const normalizeMenu = (item) => {
    const name = item.nama_menu || item.nama || item.name || ''
    const rawPrice = item.price ?? item.harga ?? 0
    const priceValue = typeof rawPrice === 'number'
      ? rawPrice
      : parseInt(String(rawPrice).replace(/\D/g, ''), 10) || 0
    const price = `Rp ${priceValue.toLocaleString('id-ID')}`
    return {
      ...item, 
      id: item.id_menu || item.id,
      name,
      nama_menu: name,
      price,
      priceValue,
      stok: Number(item.stok ?? item.availability ?? 0),
      category: item.category || item.kategori || item.nama_kategori || '',
      id_kategori: item.id_kategori ? String(item.id_kategori) : '',
      image: getImageUrl(item.image || item.gambar),
    }
  }

  const normalizedMenu = (menuItems || []).map(normalizeMenu)

  const categories = [
    { id: 'semua', name: 'Semua' },
    { id: '1', name: 'Makanan' },
    { id: '2', name: 'Minuman' },
    { id: '3', name: 'Snack' },
  ]

  const filteredMenu = normalizedMenu.filter(item => {
    const itemName = item.name.toLowerCase()
    const matchesCategory = activeCategory === 'semua' || item.id_kategori === activeCategory
    const matchesSearch = itemName.includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const showNotification = (message) => {
    setNotification(message)
    setTimeout(() => setNotification(''), 3000)
  }

  const handleAdd = (item) => {
    addToCart(item);
    showNotification(`${item.name} masuk keranjang`);
  }

  const tableNumber = tableId || '1'

  return (
    <div className="app">
      {notification && (
        <div className="notification">{notification}</div>
      )}

      <nav className="navbar">
        <div className="nav-left">
          <div className="logo-container">
            <div className="logo">
              <img 
                src="/images/logo-bosmentai.jpg" 
                alt="Logo Bos Mentai" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50px' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerText = 'BM' }}
              />
            </div>
            <div className="brand">
              <div className="brand-name">Bos Mentai</div>
              <div className="restaurant-name">Premium Dimsum & Mentai</div>
            </div>
          </div>
        </div>
        <div className="nav-right">
          <div className="search-bar">
            <span className="material-icons">search</span>
            <input
              type="text"
              placeholder="mau makan apa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="table-indicator">
            <span className="material-icons">table_restaurant</span>
            <span>Meja {tableNumber}</span>
          </div>
          <div className="cart-icon" onClick={() => setShowCart(true)}>
            <span className="material-icons">shopping_cart</span>
            {getTotalItems() > 0 && (
              <span className="cart-badge">{getTotalItems()}</span>
            )}
          </div>
        </div>
      </nav>

      <div className="category-menu">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <main className="main-content">
        <div className="page-grid">
          <section className="menu-section">
            <div className="menu-header">
              <h2>{activeCategory === 'semua' ? 'Semua Menu' : categories.find(c => c.id === activeCategory)?.name}</h2>
              <span className="menu-count">{filteredMenu.length} menu tersedia.</span>
            </div>

            {loading ? (
              <div className="menu-grid" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '220px' }}>
                <p style={{ color: '#666' }}>Memuat menu...</p>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="menu-grid" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '220px' }}>
                <p style={{ color: '#999' }}>Menu tidak ditemukan atau belum tersedia.</p>
              </div>
            ) : (
              <div className="menu-grid">
                {filteredMenu.map(item => (
                  <MenuCard key={item.id} item={item} onAdd={() => handleAdd(item)} />
                ))}
              </div>
            )}
          </section>

          <Keranjang visible={showCart} onClose={() => setShowCart(false)} />
        </div>
      </main>
    </div>
  )
}

export default MenuPage