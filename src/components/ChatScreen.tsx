import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ArrowLeft, Plus, Send } from 'lucide-react';
import { BRAND_NAME } from '../config/brand';
import { ChatMessageItem, ChatThread, UserSession } from '../lib/api';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface ChatScreenProps {
  session: UserSession;
  onUnreadCountChange: (count: number) => void;
}

const DEMO_INITIAL_THREADS: ChatThread[] = [
  {
    conversationId: 'conv-driver-raka',
    participantName: 'Raka Pratama (Driver Demo)',
    participantRole: 'driver',
    lastMessage: 'Saya sudah di dekat titik jemput ya kak!',
    unreadCount: 1,
    updatedAt: Date.now() - 120000,
  },
  {
    conversationId: 'conv-resto-bakmi',
    participantName: 'Bakmi Pedas Nusantara',
    participantRole: 'merchant',
    lastMessage: 'Pesanan sedang kami kemas hangat.',
    unreadCount: 0,
    updatedAt: Date.now() - 600000,
  },
];

const DEMO_INITIAL_MESSAGES: Record<string, ChatMessageItem[]> = {
  'conv-driver-raka': [
    {
      id: 'm1',
      conversationId: 'conv-driver-raka',
      senderRole: 'partner',
      senderName: 'Raka Pratama',
      text: 'Halo kak, saya sudah berangkat menuju titik jemput.',
      createdAt: Date.now() - 240000,
    },
    {
      id: 'm2',
      conversationId: 'conv-driver-raka',
      senderRole: 'partner',
      senderName: 'Raka Pratama',
      text: 'Saya sudah di dekat titik jemput ya kak!',
      createdAt: Date.now() - 120000,
    },
  ],
  'conv-resto-bakmi': [
    {
      id: 'm3',
      conversationId: 'conv-resto-bakmi',
      senderRole: 'partner',
      senderName: 'Bakmi Pedas Nusantara',
      text: 'Pesanan sedang kami kemas hangat.',
      createdAt: Date.now() - 600000,
    },
  ],
};

export const ChatScreen: React.FC<ChatScreenProps> = ({ session, onUnreadCountChange }) => {
  const [filter, setFilter] = useState<'all' | 'driver' | 'merchant'>('all');
  const [threads, setThreads] = useState<ChatThread[]>(DEMO_INITIAL_THREADS);
  const [activeConv, setActiveConv] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [demoMessageMap, setDemoMessageMap] = useState<Record<string, ChatMessageItem[]>>(
    DEMO_INITIAL_MESSAGES
  );
  const [draft, setDraft] = useState('');

  // Real-time Firestore listener when authenticated with verified Firebase Auth
  useEffect(() => {
    if (session.isDemo || !session.emailVerified) {
      const totalUnread = threads.reduce((acc, t) => acc + t.unreadCount, 0);
      onUnreadCountChange(totalUnread);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', session.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded: ChatThread[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            conversationId: d.id,
            participantName: String(data.participantName || 'Mitra'),
            participantRole: (data.participantRole as ChatThread['participantRole']) || 'driver',
            lastMessage: String(data.lastMessage || ''),
            unreadCount: Number(data.unreadCount || 0),
            updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
          };
        });
        loaded.sort((a, b) => b.updatedAt - a.updatedAt);
        setThreads(loaded);
        onUnreadCountChange(loaded.reduce((acc, t) => acc + t.unreadCount, 0));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.uid, session.isDemo, session.emailVerified]);

  // Real-time messages listener for active thread
  useEffect(() => {
    if (!activeConv) return;
    if (session.isDemo || !session.emailVerified) {
      setMessages(demoMessageMap[activeConv.conversationId] || []);
      return;
    }

    const msgQuery = query(
      collection(db, 'conversations', activeConv.conversationId, 'messages'),
      where('userId', '==', session.uid)
    );
    const unsub = onSnapshot(
      msgQuery,
      (snap) => {
        const items: ChatMessageItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            conversationId: activeConv.conversationId,
            senderRole: (data.senderRole as 'user' | 'partner') || 'user',
            senderName: String(data.senderName || 'Saya'),
            text: String(data.text || ''),
            createdAt: data.createdAt?.toMillis?.() || Date.now(),
          };
        });
        items.sort((a, b) => a.createdAt - b.createdAt);
        setMessages(items);
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.LIST,
          `conversations/${activeConv.conversationId}/messages`
        )
    );
    return () => unsub();
  }, [activeConv, session.isDemo, session.emailVerified, session.uid, demoMessageMap]);

  const handleOpenThread = async (thread: ChatThread) => {
    setActiveConv(thread);
    if (thread.unreadCount > 0) {
      if (session.isDemo || !session.emailVerified) {
        setThreads((prev) =>
          prev.map((t) =>
            t.conversationId === thread.conversationId ? { ...t, unreadCount: 0 } : t
          )
        );
      } else {
        try {
          await updateDoc(doc(db, 'conversations', thread.conversationId), {
            unreadCount: 0,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `conversations/${thread.conversationId}`);
        }
      }
    }
  };

  const handleStartSupportChat = async () => {
    const convId = `conv-support-${Date.now()}`;
    if (session.isDemo || !session.emailVerified) {
      const created: ChatThread = {
        conversationId: convId,
        participantName: `Bantuan ${BRAND_NAME}`,
        participantRole: 'support',
        lastMessage: 'Halo! Ada yang bisa kami bantu hari ini?',
        unreadCount: 0,
        updatedAt: Date.now(),
      };
      setThreads((p) => [created, ...p]);
      setDemoMessageMap((p) => ({
        ...p,
        [convId]: [
          {
            id: `msg-${Date.now()}`,
            conversationId: convId,
            senderRole: 'partner',
            senderName: `Bantuan ${BRAND_NAME}`,
            text: 'Halo! Ada yang bisa kami bantu hari ini?',
            createdAt: Date.now(),
          },
        ],
      }));
      setActiveConv(created);
      return;
    }

    try {
      await setDoc(doc(db, 'conversations', convId), {
        conversationId: convId,
        userId: session.uid,
        participantName: `Bantuan ${BRAND_NAME}`.slice(0, 80),
        participantRole: 'support',
        lastMessage: 'Halo! Ada yang bisa kami bantu hari ini?'.slice(0, 300),
        unreadCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveConv({
        conversationId: convId,
        participantName: `Bantuan ${BRAND_NAME}`,
        participantRole: 'support',
        lastMessage: 'Halo! Ada yang bisa kami bantu hari ini?',
        unreadCount: 0,
        updatedAt: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `conversations/${convId}`);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !draft.trim()) return;
    const text = draft.trim().slice(0, 600);
    setDraft('');

    if (session.isDemo || !session.emailVerified) {
      const msg: ChatMessageItem = {
        id: `m-${Date.now()}`,
        conversationId: activeConv.conversationId,
        senderRole: 'user',
        senderName: session.displayName,
        text,
        createdAt: Date.now(),
      };
      setDemoMessageMap((prev) => ({
        ...prev,
        [activeConv.conversationId]: [...(prev[activeConv.conversationId] || []), msg],
      }));
      setThreads((prev) =>
        prev.map((t) =>
          t.conversationId === activeConv.conversationId
            ? { ...t, lastMessage: text, updatedAt: Date.now() }
            : t
        )
      );
      window.setTimeout(() => {
        const reply: ChatMessageItem = {
          id: `r-${Date.now()}`,
          conversationId: activeConv.conversationId,
          senderRole: 'partner',
          senderName: activeConv.participantName,
          text: 'Siap kak, pesan sudah kami terima! (Balasan Mode Demo)',
          createdAt: Date.now(),
        };
        setDemoMessageMap((prev) => ({
          ...prev,
          [activeConv.conversationId]: [...(prev[activeConv.conversationId] || []), reply],
        }));
      }, 650);
      return;
    }

    try {
      await addDoc(collection(db, 'conversations', activeConv.conversationId, 'messages'), {
        conversationId: activeConv.conversationId,
        userId: session.uid,
        senderRole: 'user',
        senderName: (session.displayName || 'Saya').trim().slice(0, 80) || 'Saya',
        text,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'conversations', activeConv.conversationId), {
        lastMessage: text.slice(0, 300),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `conversations/${activeConv.conversationId}/messages`
      );
    }
  };

  if (activeConv) {
    return (
      <div className="min-h-full flex flex-col bg-[#F4F6F4] dark:bg-slate-950">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            aria-label="Kembali ke daftar chat"
            onClick={() => setActiveConv(null)}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold truncate">{activeConv.participantName}</h1>
            <p className="text-[11px] text-[#0FA958] font-semibold">
              {session.isDemo ? 'Obrolan Demo' : 'Real-time Firestore'}
            </p>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-2.5 overflow-y-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                  m.senderRole === 'user'
                    ? 'bg-[#0FA958] text-white rounded-br-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-bl-sm'
                }`}
              >
                <p>{m.text}</p>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSend}
          className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tulis pesan..."
            className="flex-1 min-h-[44px] rounded-full bg-slate-100 dark:bg-slate-800 px-4 text-xs"
          />
          <button
            type="submit"
            aria-label="Kirim pesan"
            className="w-11 h-11 rounded-full bg-[#0FA958] text-white flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  const visibleThreads =
    filter === 'all' ? threads : threads.filter((t) => t.participantRole === filter);

  return (
    <div className="min-h-full bg-[#F4F6F4] dark:bg-slate-950 p-4 relative pb-20">
      <h1 className="text-xl font-extrabold">Social &amp; Chat</h1>
      <div className="mt-3 flex gap-2">
        {[
          { id: 'all' as const, label: 'Semua chat' },
          { id: 'driver' as const, label: 'Driver' },
          { id: 'merchant' as const, label: 'Merchant' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`min-h-[38px] px-4 rounded-full text-xs font-bold border transition-colors ${
              filter === f.id
                ? 'bg-[#0FA958] text-white border-[#0FA958]'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {visibleThreads.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 text-center text-xs text-slate-500">
            Belum ada percakapan. Tekan tombol + untuk menghubungi bantuan.
          </div>
        ) : (
          visibleThreads.map((t) => (
            <button
              key={t.conversationId}
              type="button"
              onClick={() => void handleOpenThread(t)}
              className="w-full text-left rounded-3xl bg-white dark:bg-slate-900 p-3.5 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-full bg-[#0FA958] text-white font-extrabold flex items-center justify-center shrink-0">
                {t.participantName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold truncate">{t.participantName}</p>
                  <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                    {new Date(t.updatedAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {t.lastMessage}
                  </p>
                  {t.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {t.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        aria-label="Mulai chat baru"
        onClick={() => void handleStartSupportChat()}
        className="fixed bottom-24 right-5 z-20 w-13 h-13 rounded-full bg-[#0FA958] text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};
