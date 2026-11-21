import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AccountList } from './components/AccountList';
import { ChatArea } from './components/ChatArea/ChatArea';
import { ChatList } from './components/ChatList/ChatList';
import { Inspector } from './components/Inspector/Inspector';
import { AddAccountModal } from './components/modals/AddAccountModal';
import { GroupModal } from './components/modals/GroupModal';
import { MergeModal } from './components/modals/MergeModal';
import { ServiceModal } from './components/modals/ServiceModal';
import { WorkspaceRail } from './components/WorkspaceRail';
import type { RailAction } from './components/WorkspaceRail';
import { GLOBAL_CSS, PLATFORMS } from './constants';
import { mockAccounts, mockAISuggestions, mockChats, mockMessages, mockWorkspaces } from './mock';
import type {
  Chat,
  ChatTabId,
  Message,
  ModalType,
  PlatformId,
  RailItem,
  RailMode,
  Workspace,
} from './types';

const ALL_SERVICE_IDS = Object.keys(PLATFORMS) as PlatformId[];
const INITIAL_SERVICE_IDS: PlatformId[] = [...new Set(mockAccounts.map((a) => a.platform))];

const accountsOfRail = (mode: RailMode, id: string) =>
  mockAccounts.filter((a) => (mode === 'group' ? a.workspaceId === id : a.platform === id));

export default function ChatHub() {
  const [railMode, setRailMode] = useState<RailMode>('group');
  const [workspaces, setWorkspaces] = useState<Workspace[]>(mockWorkspaces);
  const [serviceIds, setServiceIds] = useState<PlatformId[]>(INITIAL_SERVICE_IDS);
  const [railModal, setRailModal] = useState<'group' | 'service' | null>(null);
  const [wsId, setWsId] = useState('w2');
  const [accId, setAccId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [messages, setMessages] = useState<Message[]>(() =>
    mockMessages.map((m) => ({ ...m, total: m.countdown })),
  );
  const [chatId, setChatId] = useState<string | null>('c1');
  const [tab, setTab] = useState<ChatTabId>('all');
  const [query, setQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformId | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [stealth, setStealth] = useState(false);
  const [autoReply, setAutoReply] = useState(true);
  const [inspector, setInspector] = useState(true);

  // Đồng hồ đếm ngược cho tin nhắn tự hủy
  useEffect(() => {
    const t = setInterval(
      () =>
        setMessages((ms) =>
          ms.map((m) =>
            m.isBurnAfterReading && (m.countdown ?? 0) > 0
              ? { ...m, countdown: (m.countdown ?? 0) - 1 }
              : m,
          ),
        ),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  const wsAccounts = useMemo(() => accountsOfRail(railMode, wsId), [railMode, wsId]);
  const wsChats = useMemo(
    () =>
      chats.filter((c) =>
        (c.mergedFrom || [c.accountId]).some((id) => wsAccounts.some((a) => a.id === id)),
      ),
    [chats, wsAccounts],
  );

  const railItems = useMemo<RailItem[]>(() => {
    const unreadOf = (mode: RailMode, id: string) => {
      const accs = accountsOfRail(mode, id);
      return chats
        .filter((c) =>
          (c.mergedFrom || [c.accountId]).some((aid) => accs.some((a) => a.id === aid)),
        )
        .reduce((s, c) => s + c.unread, 0);
    };
    if (railMode === 'group') {
      return workspaces.map((w) => ({ ...w, unread: unreadOf('group', w.id) }));
    }
    return serviceIds.map((p) => ({
      id: p,
      name: PLATFORMS[p].label,
      platform: p,
      unread: unreadOf('service', p),
    }));
  }, [railMode, chats, workspaces, serviceIds]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wsChats
      .filter((c) => !accId || (c.mergedFrom || [c.accountId]).includes(accId))
      .filter(
        (c) =>
          !platformFilter ||
          (c.mergedFrom || [c.accountId]).some(
            (id) => mockAccounts.find((a) => a.id === id)?.platform === platformFilter,
          ),
      )
      .filter(
        (c) =>
          tab === 'all' ||
          (tab === 'unread' && c.unread > 0) ||
          (tab === 'pinned' && c.isPinned) ||
          (tab === 'important' && c.important),
      )
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.last.toLowerCase().includes(q))
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [wsChats, accId, platformFilter, tab, query]);

  const selectWs = (id: string, mode: RailMode = railMode) => {
    setWsId(id);
    setAccId(null);
    setPlatformFilter(null);
    setMergeMode(false);
    setPicked([]);
    const accs = accountsOfRail(mode, id);
    const first = chats.find((c) => accs.some((a) => a.id === c.accountId));
    setChatId(first ? first.id : null);
  };
  const changeRailMode = (mode: RailMode) => {
    setRailMode(mode);
    selectWs(mode === 'group' ? workspaces[0].id : serviceIds[0], mode);
  };
  const addWorkspace = (name: string, icon: LucideIcon) => {
    const id = `w${Date.now()}`;
    setWorkspaces((ws) => [...ws, { id, name, icon, unread: 0 }]);
    setRailModal(null);
    selectWs(id);
  };
  const addService = (platform: PlatformId) => {
    setServiceIds((s) => (s.includes(platform) ? s : [...s, platform]));
    setRailModal(null);
    selectWs(platform);
  };
  const railAction = (action: RailAction, id: string) => {
    if (action === 'account') {
      setModal('account');
      return;
    }
    if (action === 'read') {
      const ids = accountsOfRail(railMode, id).map((a) => a.id);
      setChats((cs) =>
        cs.map((c) =>
          (c.mergedFrom || [c.accountId]).some((aid) => ids.includes(aid)) ? { ...c, unread: 0 } : c,
        ),
      );
      return;
    }
    if (railItems.length <= 1) return;
    const rest = railItems.filter((w) => w.id !== id);
    if (railMode === 'group') setWorkspaces((ws) => ws.filter((w) => w.id !== id));
    else setServiceIds((s) => s.filter((x) => x !== id));
    if (id === wsId) selectWs(rest[0].id);
  };
  const active = chats.find((c) => c.id === chatId) || null;
  const activeAcc = active ? mockAccounts.find((a) => a.id === active.accountId) || null : null;
  const activeMsgs = active ? messages.filter((m) => m.chatId === active.id) : [];
  const suggestions = active
    ? mockAISuggestions.some((s) => s.chatId === active.id)
      ? mockAISuggestions.filter((s) => s.chatId === active.id)
      : mockAISuggestions.filter((s) => s.chatId === 'default')
    : [];

  const openChat = (id: string) => {
    setChatId(id);
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  };
  const pin = (id: string) =>
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c)));
  const send = (cid: string, content: string, enc: boolean, burn: number) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setMessages((ms) => [
      ...ms,
      {
        id: `m${Date.now()}`,
        chatId: cid,
        role: 'me',
        content,
        time,
        isEncrypted: enc,
        isBurnAfterReading: burn > 0,
        countdown: burn || undefined,
        total: burn || undefined,
      },
    ]);
    setChats((cs) => cs.map((c) => (c.id === cid ? { ...c, last: content, time } : c)));
  };
  const doMerge = () => {
    const sel = chats.filter((c) => picked.includes(c.id));
    const base = sel[0];
    const merged: Chat = {
      ...base,
      id: `cm${Date.now()}`,
      name: sel.map((c) => c.name.split(' ')[0]).join(' + '),
      unread: sel.reduce((s, c) => s + c.unread, 0),
      mergedFrom: [...new Set(sel.flatMap((c) => c.mergedFrom || [c.accountId]))],
      isEncrypted: sel.every((c) => c.isEncrypted),
      isPinned: sel.some((c) => c.isPinned),
    };
    setMessages((ms) =>
      ms.map((m) => (picked.includes(m.chatId) ? { ...m, chatId: merged.id } : m)),
    );
    setChats((cs) => [merged, ...cs.filter((c) => !picked.includes(c.id))]);
    setChatId(merged.id);
    setPicked([]);
    setMergeMode(false);
    setModal(null);
  };

  return (
    <div
      className="ch-root flex w-full h-screen overflow-hidden bg-background text-text-primary"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif' }}
    >
      <style>{GLOBAL_CSS}</style>
      <WorkspaceRail
        items={railItems}
        mode={railMode}
        onModeChange={changeRailMode}
        activeId={wsId}
        onSelect={(id) => selectWs(id)}
        onAdd={() => setRailModal(railMode === 'group' ? 'group' : 'service')}
        onItemAction={railAction}
      />
      <AccountList
        workspace={railItems.find((w) => w.id === wsId) || railItems[0]}
        accounts={wsAccounts}
        chats={wsChats}
        activeId={accId}
        onSelect={setAccId}
        onAdd={() => setModal('account')}
      />
      <ChatList
        chats={visible}
        allChats={wsChats}
        accounts={wsAccounts}
        account={wsAccounts.find((a) => a.id === accId) ?? null}
        activeChatId={chatId}
        onSelect={openChat}
        tab={tab}
        setTab={setTab}
        query={query}
        setQuery={setQuery}

        onPin={pin}
        mergeMode={mergeMode}

        picked={picked}
        setPicked={setPicked}
        onMerge={() => setModal('merge')}
      />
      <ChatArea
        chat={active}
        account={activeAcc}
        messages={activeMsgs}
        suggestions={suggestions}
        stealth={stealth}
        setStealth={setStealth}
        autoReply={autoReply}
        setAutoReply={setAutoReply}
        onSend={send}
        showInspector={inspector}
        setShowInspector={setInspector}
      />
      {inspector && (
        <Inspector
          chat={active}
          account={activeAcc}
          autoReply={autoReply}
          setAutoReply={setAutoReply}
          stealth={stealth}
          setStealth={setStealth}
          onClose={() => setInspector(false)}
        />
      )}
      {modal === 'merge' && (
        <MergeModal
          chats={chats.filter((c) => picked.includes(c.id))}
          onConfirm={doMerge}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'account' && <AddAccountModal onClose={() => setModal(null)} />}
      {railModal === 'group' && (
        <GroupModal onClose={() => setRailModal(null)} onCreate={addWorkspace} />
      )}
      {railModal === 'service' && (
        <ServiceModal
          available={ALL_SERVICE_IDS.filter((p) => !serviceIds.includes(p))}
          onClose={() => setRailModal(null)}
          onAdd={addService}
        />
      )}
    </div>
  );
}