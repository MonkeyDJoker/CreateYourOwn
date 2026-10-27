import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { getProducts } from '../services/product';
import { CATEGORY_TREE } from '../constants/categories';
import './Board.css';

const A5_W = 1480; // A5 导出宽度（像素）
const A5_H = 2100; // A5 导出高度（像素）

// 卡片默认展示尺寸（白板坐标系下）
const DEFAULT_CARD_W = 260;
const DEFAULT_CARD_H = 260;

export default function Board() {
  const navigate = useNavigate();
  const boardRef = useRef(null);
  const dragRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedUid, setSelectedUid] = useState(null);
  const [exporting, setExporting] = useState(false);

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

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const cat = p.category || 'Other';
      const sub = p.subCategory || '';
      return cat === activeCategory && sub === activeSub;
    });
  }, [products, activeCategory, activeSub]);

  /* =====================================================
     通用拖拽 / 缩放 / 旋转逻辑
     每个 item 结构：
     {
       uid, productId,
       x, y,           // 左上角位置（白板坐标）
       width, height,  // 展示尺寸
       rotation,       // 旋转角度（度）
       zIndex,         // 图层顺序
     }
     ===================================================== */

  const getBoardRect = () => boardRef.current?.getBoundingClientRect();

  /* ---------- 移动 ---------- */
  const onMoveStart = (e, item) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const rect = getBoardRect();
    if (!rect) return;

    dragRef.current = {
      mode: 'move',
      uid: item.uid,
      startX: e.clientX,
      startY: e.clientY,
      originX: item.x,
      originY: item.y,
    };
    setSelectedUid(item.uid);
    attachListeners();
  };

  /* ---------- 缩放 ---------- */
  const onResizeStart = (e, item) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dragRef.current = {
      mode: 'resize',
      uid: item.uid,
      startX: e.clientX,
      startY: e.clientY,
      originW: item.width,
      originH: item.height,
    };
    setSelectedUid(item.uid);
    attachListeners();
  };

  /* ---------- 旋转 ---------- */
  const onRotateStart = (e, item) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const boardRect = getBoardRect();
    if (!boardRect) return;

    // 卡片中心点（屏幕坐标）
    const cx = boardRect.left + item.x + item.width / 2;
    const cy = boardRect.top + item.y + item.height / 2;

    dragRef.current = {
      mode: 'rotate',
      uid: item.uid,
      centerX: cx,
      centerY: cy,
    };
    setSelectedUid(item.uid);
    attachListeners();
  };

  const attachListeners = () => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = useCallback((e) => {
    const drag = dragRef.current;
    const rect = getBoardRect();
    if (!drag || !rect) return;

    if (drag.mode === 'move') {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setItems((prev) =>
        prev.map((it) => {
          if (it.uid !== drag.uid) return it;
          // 允许部分超出边界，但至少留 40px 在板内
          const minVisible = 40;
          let x = drag.originX + dx;
          let y = drag.originY + dy;
          x = Math.max(
            -it.width + minVisible,
            Math.min(x, rect.width - minVisible),
          );
          y = Math.max(
            -it.height + minVisible,
            Math.min(y, rect.height - minVisible),
          );
          return { ...it, x, y };
        }),
      );
    }

    if (drag.mode === 'resize') {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setItems((prev) =>
        prev.map((it) => {
          if (it.uid !== drag.uid) return it;
          const w = Math.max(60, drag.originW + dx);
          const h = Math.max(60, drag.originH + dy);
          return { ...it, width: w, height: h };
        }),
      );
    }

    if (drag.mode === 'rotate') {
      const angle =
        (Math.atan2(e.clientY - drag.centerY, e.clientX - drag.centerX) *
          180) /
        Math.PI;
      // 让“手柄方向”直接对应角度
      const rotation = angle + 90;
      setItems((prev) =>
        prev.map((it) =>
          it.uid === drag.uid ? { ...it, rotation } : it,
        ),
      );
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  /* ---------- 添加 / 删除 ---------- */
  const addProduct = (product) => {
    const maxZ = items.reduce((m, it) => Math.max(m, it.zIndex), 0);
    const uid = `${product.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    setItems((prev) => {
      const step = (prev.length % 6) * 24;
      return [
        ...prev,
        {
          uid,
          productId: product.id,
          x: 60 + step,
          y: 60 + step,
          width: DEFAULT_CARD_W,
          height: DEFAULT_CARD_H,
          rotation: 0,
          zIndex: Math.max(1, maxZ + 1),
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

  /* ---------- 图层 ---------- */
  /* ---------- 图层：与相邻层交换 ---------- */
const bringForward = () => {
  if (!selectedUid) return;
  setItems((prev) => {
    const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((it) => it.uid === selectedUid);
    if (idx === -1 || idx === sorted.length - 1) return prev; // 已经是最上层

    // 与上一层交换 zIndex
    const current = sorted[idx];
    const above = sorted[idx + 1];
    return prev.map((it) => {
      if (it.uid === current.uid) return { ...it, zIndex: above.zIndex };
      if (it.uid === above.uid) return { ...it, zIndex: current.zIndex };
      return it;
    });
  });
};

const sendBackward = () => {
  if (!selectedUid) return;
  setItems((prev) => {
    const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((it) => it.uid === selectedUid);
    if (idx === -1 || idx === 0) return prev; // 已经是最下层

    // 与下一层交换 zIndex
    const current = sorted[idx];
    const below = sorted[idx - 1];
    return prev.map((it) => {
      if (it.uid === current.uid) return { ...it, zIndex: below.zIndex };
      if (it.uid === below.uid) return { ...it, zIndex: current.zIndex };
      return it;
    });
  });
};

  /* ---------- 导出 A5 图片 ---------- */
  const downloadDesign = async () => {
    if (!boardRef.current) return;
    setSelectedUid(null);
    setExporting(true);

    // 等一帧，确保选中框消失
    await new Promise((r) => setTimeout(r, 50));

    try {
      const boardEl = boardRef.current;
      const rect = boardEl.getBoundingClientRect();
      // 导出时把白板按 A5 真实尺寸渲染
      const scale = A5_W / rect.width;

      const canvas = await html2canvas(boardEl, {
        backgroundColor: '#ffffff',
        scale,
        useCORS: true,
        allowTaint: true,
        width: rect.width,
        height: rect.height,
        windowWidth: rect.width * scale,
        windowHeight: rect.height * scale,
      });

      const link = document.createElement('a');
      link.download = `product-board-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed, please try again.');
    } finally {
      setExporting(false);
    }
  };

  /* ---------- 选中卡片引用（用于工具栏） ---------- */
  const selectedItem = items.find((it) => it.uid === selectedUid);

  return (
    <div className="app-shell">
      {/* 顶部导航 */}
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
          {selectedItem && (
            <>
              <button className="ghost-btn" onClick={bringForward}>
                Bring Forward
              </button>
              <button className="ghost-btn" onClick={sendBackward}>
                Send Backward
              </button>
            </>
          )}
          <button
            className="ghost-btn"
            onClick={downloadDesign}
            disabled={exporting || items.length === 0}
          >
            {exporting ? 'Exporting...' : 'Download'}
          </button>
          <button
            className="ghost-btn"
            onClick={clearAll}
            disabled={items.length === 0}
          >
            Clear
          </button>
          <button className="ghost-btn" onClick={() => navigate('/')}>
            Home
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* 左侧子导航 */}
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

        {/* 右侧白板（A5 比例） */}
        <main className="board-area">
          <div className="board-stage">
            <div className="board" ref={boardRef}>
              {items.length === 0 && (
                <div className="board-empty">
                  Click a product on the left to place it here
                </div>
              )}

              {items.map((item) => {
                const p = products.find((x) => x.id === item.productId);
                if (!p) return null;
                const isSelected = selectedUid === item.uid;

                return (
                  <div
                    key={item.uid}
                    className={`board-card ${isSelected ? 'is-selected' : ''}`}
                    style={{
                      left: item.x,
                      top: item.y,
                      width: item.width,
                      height: item.height,
                      zIndex: item.zIndex,
                      transform: `rotate(${item.rotation}deg)`,
                    }}
                    onMouseDown={(e) => onMoveStart(e, item)}
                  >
                    {/* 图片本体 */}
                    <div className="card-image">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          draggable={false}
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <span className="card-placeholder">
                          {p.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    <button
                      className="card-remove"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => removeItem(item.uid, e)}
                      title="Remove"
                    >
                      ×
                    </button>

                    {/* 选中态：旋转手柄 + 缩放手柄 */}
                    {isSelected && (
                      <>
                        <div
                          className="handle handle-rotate"
                          onMouseDown={(e) => onRotateStart(e, item)}
                          title="Rotate"
                        >
                          ⟳
                        </div>
                        <div
                          className="handle handle-resize"
                          onMouseDown={(e) => onResizeStart(e, item)}
                          title="Resize"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}