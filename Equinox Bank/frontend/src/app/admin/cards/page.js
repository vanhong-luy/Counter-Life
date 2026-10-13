'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Search, CreditCard, RefreshCw } from 'lucide-react';

export default function AdminCardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'DEBIT', 'CREDIT', 'PENDING_REQUESTS', 'FROZEN'
  
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 15;

  const load = async (q = search, tab = activeTab, pageNum = page) => {
    setLoading(true);
    setError('');
    const offset = (pageNum - 1) * limit;
    try {
      const params = { limit, offset, filter: tab };
      if (q) params.search = q;
      
      const [cardsData, reqsData] = await Promise.all([
        api.admin.getCards(params),
        api.admin.getCreditRequests({ status: 'PENDING' }).catch(() => [])
      ]);
      
      setCards(cardsData.cards || []);
      setTotal(cardsData.total || 0);
      setPendingRequests(Array.isArray(reqsData) ? reqsData : []);
    } catch (err) {
      setError(err.message || 'Failed to load cards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(search, activeTab, page); 
  }, [activeTab, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(search, activeTab, 1);
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setPage(1);
  };

  // Map pending request to card ID for quick lookup
  const pendingByCardId = new Map();
  pendingRequests.forEach(r => {
    if (r.cardId) pendingByCardId.set(Number(r.cardId), r);
  });

  // Filtered card list based on activeTab
  const displayedCards = cards.filter(card => {
    if (activeTab === 'PENDING_REQUESTS') {
      return pendingByCardId.has(Number(card.cardId));
    }
    if (activeTab === 'FROZEN') {
      return card.isFrozen;
    }
    if (activeTab === 'DEBIT') {
      return (card.cardTypeName || '').toLowerCase() === 'debit';
    }
    if (activeTab === 'CREDIT') {
      return (card.cardTypeName || '').toLowerCase() === 'credit';
    }
    return true;
  }).sort((a, b) => {
    // Sort cards with pending requests to the top by default
    const aHasReq = pendingByCardId.has(Number(a.cardId));
    const bHasReq = pendingByCardId.has(Number(b.cardId));
    if (aHasReq && !bHasReq) return -1;
    if (!aHasReq && bHasReq) return 1;
    return 0;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="serifTitle" style={{ fontSize: 28, margin: '0 0 4px', color: '#f3edd8' }}>Card Management</h1>
          <div style={{ color: 'var(--text-faint)', fontSize: 13 }}>{total} card{total !== 1 ? 's' : ''} issued</div>
        </div>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          className="btn"
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
            background: activeTab === 'ALL' ? 'var(--gold)' : '#161920',
            color: activeTab === 'ALL' ? '#000' : 'var(--text-dim)',
            border: activeTab === 'ALL' ? 'none' : '1px solid #2b303a'
          }}
          onClick={() => handleTabChange('ALL')}
        >
          All Cards
        </button>

        <button
          className="btn"
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
            background: activeTab === 'DEBIT' ? 'var(--gold)' : '#161920',
            color: activeTab === 'DEBIT' ? '#000' : 'var(--text-dim)',
            border: activeTab === 'DEBIT' ? 'none' : '1px solid #2b303a'
          }}
          onClick={() => handleTabChange('DEBIT')}
        >
          Debit Cards
        </button>

        <button
          className="btn"
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
            background: activeTab === 'CREDIT' ? 'var(--gold)' : '#161920',
            color: activeTab === 'CREDIT' ? '#000' : 'var(--text-dim)',
            border: activeTab === 'CREDIT' ? 'none' : '1px solid #2b303a'
          }}
          onClick={() => handleTabChange('CREDIT')}
        >
          Credit Cards
        </button>

        <button
          className="btn"
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
            background: activeTab === 'PENDING_REQUESTS' ? 'var(--gold)' : '#161920',
            color: activeTab === 'PENDING_REQUESTS' ? '#000' : pendingRequests.length > 0 ? '#F59E0B' : 'var(--text-dim)',
            border: activeTab === 'PENDING_REQUESTS' ? 'none' : '1px solid #2b303a',
            display: 'flex', alignItems: 'center', gap: 6
          }}
          onClick={() => handleTabChange('PENDING_REQUESTS')}
        >
          Pending Credit Requests
          {pendingRequests.length > 0 && (
            <span style={{
              background: activeTab === 'PENDING_REQUESTS' ? '#000' : '#F59E0B',
              color: activeTab === 'PENDING_REQUESTS' ? '#FFF' : '#000',
              padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700
            }}>
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          className="btn"
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
            background: activeTab === 'FROZEN' ? 'var(--gold)' : '#161920',
            color: activeTab === 'FROZEN' ? '#000' : 'var(--text-dim)',
            border: activeTab === 'FROZEN' ? 'none' : '1px solid #2b303a'
          }}
          onClick={() => handleTabChange('FROZEN')}
        >
          Frozen Cards
        </button>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--field)', borderRadius: 8, padding: '0 12px', border: '1px solid var(--border)' }}>
          <Search size={16} color="var(--text-faint)" />
          <input
            type="text"
            placeholder="Search by name, email, or card ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', padding: '10px 8px', fontSize: 13 }}
          />
        </div>
        <button type="submit" className="btn btnGold" style={{ padding: '10px 20px' }}>Search</button>
        <button type="button" className="btn btnOutline" onClick={() => { setSearch(''); setPage(1); load('', activeTab, 1); }} style={{ padding: '10px 20px' }}>
          <RefreshCw size={14} /> Clear
        </button>
      </form>

      {loading ? (
        <div className="loadingBox"><RefreshCw className="animate-spin" style={{ margin: '0 auto 12px' }} />Loading cards…</div>
      ) : cards.length === 0 ? (
        <div className="emptyState" style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>No cards found for this filter.</div>
      ) : (
        <>
          <div style={{ background: '#161920', border: '1px solid #2b303a', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2b303a' }}>
                  <th style={thStyle}>Card ID</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Card Number</th>
                  <th style={thStyle}>Credit Limit</th>
                  <th style={thStyle}>Outstanding</th>
                  <th style={thStyle}>Pending Request</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => {
                  const pendingReq = pendingByCardId.get(Number(card.cardId));
                  return (
                    <tr
                      key={card.cardId}
                      onClick={() => router.push(`/admin/cards/${card.cardId}`)}
                      style={{ borderBottom: '1px solid #2b303a', cursor: 'pointer', background: pendingReq ? 'rgba(245, 158, 11, 0.04)' : 'none' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = pendingReq ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = pendingReq ? 'rgba(245, 158, 11, 0.04)' : 'none'}
                    >
                      <td style={tdStyle}>#{card.cardId}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{card.customerName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{card.customerEmail}</div>
                      </td>
                      <td style={tdStyle}>
                        <span className="pill" style={{ background: 'rgba(212,169,74,0.12)', color: 'var(--gold-light)', padding: '3px 8px', fontSize: 10.5 }}>
                          {card.network} {card.cardTypeName}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{card.cardNumber}</td>
                      <td style={tdStyle}>{card.creditLimit != null ? '$' + Number(card.creditLimit).toLocaleString() : '—'}</td>
                      <td style={tdStyle}>{card.outstandingBalance != null ? '$' + Number(card.outstandingBalance).toLocaleString() : '—'}</td>
                      <td style={tdStyle}>
                        {pendingReq ? (
                          <span style={{ fontSize: 11, background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: 6, fontWeight: 700, display: 'inline-block' }}>
                            ⚡ Req: ${Number(pendingReq.requestedLimit).toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span className={`pill ${card.isFrozen ? 'pillPending' : 'pillApproved'}`} style={{ fontSize: 10.5, padding: '3px 8px' }}>
                          {card.isFrozen ? 'Frozen' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>
              Showing {cards.length} of {total} results (Page {page} of {Math.max(1, Math.ceil(total / limit))})
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btnOutline"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ padding: '6px 14px', fontSize: 12 }}
              >
                Previous
              </button>
              <button
                className="btn btnOutline"
                disabled={page >= Math.ceil(total / limit)}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 14px', fontSize: 12 }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle = { textAlign: 'left', padding: '12px 14px', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600 };
const tdStyle = { padding: '12px 14px', fontSize: 13, color: '#e8e6e0' };
