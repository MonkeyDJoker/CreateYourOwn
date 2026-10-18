import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../services/product';
import { CATEGORY_TREE } from '../constants/categories';
import './Board.css';

const CARD_W = 128;
const CARD_H = 128;

export default function Board() {
  const navigate = useNavigate();
  const boardRef = useRef(null);
  const dragRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedUid, setSelectedUid] = useState(null);

  // 当前选中的大分类 / 小分类
  const [activeCategory, setActiveCategory] = useState('Electronics');
  const [activeSub, setActiveSub] = useState('Audio');

  /* ---------- 加载产品 ---------- */
  useEffect(() => {
    let mounted = true;
    getProducts()
      .then((data) => {
        if (mounted) setProducts(data);
      })
      .catch((err) => console.error('Failed to load products:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- 按分类过滤产品 ---------- */
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const cat = p.category || 'Other';
      const sub = p.subCategory || '';
      return cat === activeCategory && sub === activeSub;
    });
  }, [products, activeCategory, activeSub]);

  /* ---------- 拖拽逻辑 ---------- */
  const handleMouseMove = useCallback((e) => {
    const drag = dragRef.current;
    const board = boardRef.current;
    if (!drag || !board) return;

    const rect = board.getBoundingClientRect();
    let x = e.clientX - rect.left - drag.offsetX;
    let y = e.clientY - rect.top - drag.offsetY;

    x = Math.max(0, Math.min(x, rect.width - CARD_W));
    y = Math.max(0, Math.min(y, rect.height - CARD_H));

    setItems((prev) =>
      prev.map((it) => (it.uid === drag.uid ? { ...it, x, y } : it)),
    );
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', endDrag);
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', endDrag);
    };
  }, [handleMouseMove, endDrag]);

  const startDrag = (e, item) => {
    if (e.button !== 0) return;
    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    dragRef.current = {
      uid: item.uid,
      offsetX: e.clientX - rect.left - item.x,
      offsetY: e.clientY - rect.top - item.y,
    };
    setSelectedUid(item.uid);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', endDrag);
    document.body.style.userSelect = 'none';
  };

  /* ---------- 添加 / 删除 ---------- */
  const addProduct = (product) => {
    const board = boardRef.current;
    const rect = board?.getBoundingClientRect();
    const w = rect?.width ?? 900;
    const h = rect?.height ?? 600;

    const uid = `${product.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    setItems((prev) => {
      const step = (prev.length % 6) * 28;
      return [
        ...prev,
        {
          uid,
          productId: product.id,
          x: Math.min(40 + step, Math.max(0, w - CARD_W - 20)),
          y: Math.min(40 + step, Math.max(0, h - CARD_H - 20)),
        },
      ];
    });
    setSelectedUid(uid);
  };

  const removeItem = (uid, e) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((it) => it.uid !== uid));
    if (selectedUid === uid) setSelectedUid(null);
  };

  const clearAll = () => {
    setItems([]);
    setSelectedUid(null);
  };
return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-brand">Product Board</div>

        <nav className="topnav-menu">
          {Object.keys(CATEGORY_TREE).map((cat) => (
            <button
              key={cat}
              className={`topnav-item ${
                activeCategory === cat ? 'is-active' : ''
              }`}
              onClick={() => {
                setActiveCategory(cat);
                setActiveSub(CATEGORY_TREE[cat][0]);
              }}
            >
              {cat}
            </button>
          ))}
        </nav>

        <div className="topnav-right">
          <span className="topnav-count">{items.length} on board</span>
          <button
            className="ghost-btn"
            onClick={() => {
              setItems([]);
              setSelectedUid(null);
            }}
            disabled={items.length === 0}
          >
            Clear Board
          </button>
          <button className="ghost-btn" onClick={() => navigate('/')}>
            Home
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="subnav">
          <h3 className="subnav-title">{activeCategory}</h3>
          <ul className="subnav-list">
            {CATEGORY_TREE[activeCategory].map((sub) => (
              <li key={sub}>
                <button
                  className={`subnav-item ${
                    activeSub === sub ? 'is-active' : ''
                  }`}
                  onClick={() => setActiveSub(sub)}
                >
                  {sub}
                </button>
              </li>
            ))}
          </ul>

          <div className="subnav-divider" />

          <h4 className="subnav-subtitle">Products</h4>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="loading">No products in this sub category</div>
          ) : (
            <ul className="product-list">
              {filteredProducts.map((p) => (
                <li key={p.id}>
                  <button
                    className="product-item"
                    onClick={() => addProduct(p)}
                  >
                    <span className="product-thumb">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} />
                      ) : (
                        <span className="placeholder">
                          {p.name.charAt(0)}
                        </span>
                      )}
                    </span>
                    <span className="product-info">
                      <span className="product-name">{p.name}</span>
                      <span className="product-price">${p.price}</span>
                    </span>
                    <span className="plus">+</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="board-area">
          <div className="board" ref={boardRef}>
            {items.length === 0 && (
              <div className="board-empty">
                Click a product on the left to place it on the board
              </div>
            )}

            {items.map((item) => {
              const p = products.find((x) => x.id === item.productId);
              if (!p) return null;
              return (
                <div
                  key={item.uid}
                  className={`board-card ${
                    selectedUid === item.uid ? 'is-selected' : ''
                  }`}
                  style={{
                    left: item.x,
                    top: item.y,
                    width: CARD_W,
                    height: CARD_H,
                  }}
                  onMouseDown={(e) => startDrag(e, item)}
                >
                  <button
                    className="card-remove"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => removeItem(item.uid, e)}
                    title="Remove"
                  >
                    ×
                  </button>
                  <div className="card-emoji">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} />
                    ) : (
                      <span>{p.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="card-name">{p.name}</div>
                  <div className="card-price">${p.price}</div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
  

