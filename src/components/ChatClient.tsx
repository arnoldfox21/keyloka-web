"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Lock,
  MessageCircle,
  Send,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import {
  getSocketBaseUrl,
  resolveImageUrl,
  type ChatMessage,
  type KostGroupDetail,
  type KostGroupRoom,
  type UserProfile,
} from "@/lib/types";

interface ChatClientProps {
  currentUser: UserProfile;
  initialConversations: ChatMessage[];
  initialGroups: KostGroupRoom[];
  initialKostId?: number;
  initialPeerId?: number;
  initialGroupKostId?: number;
}

const QUICK_REPLIES = [
  "Halo, apakah kamar masih tersedia?",
  "Boleh jadwalkan survei besok?",
  "Apakah harga sudah termasuk listrik?",
];

export function ChatClient({
  currentUser,
  initialConversations,
  initialGroups,
  initialKostId,
  initialPeerId,
  initialGroupKostId,
}: ChatClientProps) {
  const [conversations, setConversations] = useState<ChatMessage[]>(initialConversations);
  const [groups, setGroups] = useState<KostGroupRoom[]>(initialGroups);

  const [activeDirect, setActiveDirect] = useState<{
    kostId: number;
    peerId: number;
    title: string;
  } | null>(() => {
    if (initialKostId && initialPeerId) {
      return {
        kostId: initialKostId,
        peerId: initialPeerId,
        title: `Chat Properti #${initialKostId}`,
      };
    }
    return null;
  });

  const [activeGroupKostId, setActiveGroupKostId] = useState<number | null>(
    initialGroupKostId ?? null,
  );

  const [directMessages, setDirectMessages] = useState<ChatMessage[]>([]);
  const [groupDetail, setGroupDetail] = useState<KostGroupDetail | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidates, setCandidates] = useState<
    Array<{ id: number; name: string; email?: string }>
  >([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Connect Socket.IO if NEXT_PUBLIC_API_URL is configured
  useEffect(() => {
    const socketBase = getSocketBaseUrl();
    if (!socketBase) return;
    const socket = io(socketBase, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("newMessage", (msg: ChatMessage) => {
      setDirectMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setConversations((prev) =>
        prev.map((c) => {
          const peerId = c.senderId === currentUser.id ? c.receiverId : c.senderId;
          const matches =
            c.kostId === msg.kostId &&
            (msg.senderId === peerId || msg.receiverId === peerId);
          if (!matches) return c;
          return {
            ...c,
            message: msg.message,
            createdAt: msg.createdAt,
          };
        }),
      );
    });

    socket.on("newGroupMessage", (msg: KostGroupDetail["messages"][number]) => {
      setGroupDetail((prev) => {
        if (!prev || prev.kostId !== msg.kostId) return prev;
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return { ...prev, messages: [...prev.messages, msg] };
      });
      setGroups((prev) =>
        prev.map((g) =>
          g.kostId === msg.kostId
            ? { ...g, lastMessage: msg.message, lastMessageAt: msg.createdAt }
            : g,
        ),
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [currentUser.id]);

  // Load 1-on-1 chat messages
  useEffect(() => {
    if (!activeDirect) return;
    let active = true;
    async function load() {
      setLoadingRoom(true);
      try {
        const params = new URLSearchParams({
          kostId: String(activeDirect!.kostId),
          user1: String(currentUser.id),
          user2: String(activeDirect!.peerId),
        });
        const res = await fetch(`/api/proxy/chats?${params.toString()}`);
        if (res.ok && active) {
          const data = await res.json();
          setDirectMessages(Array.isArray(data) ? data : data?.data || []);
        }
        await fetch("/api/proxy/chats/read", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kostId: activeDirect!.kostId,
            senderId: activeDirect!.peerId,
            receiverId: currentUser.id,
          }),
        }).catch(() => {});

        socketRef.current?.emit("joinKostChat", {
          kostId: activeDirect!.kostId,
          userId: currentUser.id,
          peerId: activeDirect!.peerId,
        });
      } finally {
        if (active) setLoadingRoom(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [activeDirect, currentUser.id]);

  // Load Group chat detail
  useEffect(() => {
    if (!activeGroupKostId) return;
    let active = true;
    async function loadGroup() {
      setLoadingRoom(true);
      try {
        const res = await fetch(`/api/proxy/chats/groups/${activeGroupKostId}`);
        if (res.ok && active) {
          const data: KostGroupDetail = await res.json();
          setGroupDetail(data);
        }
        socketRef.current?.emit("joinGroupChat", {
          kostId: activeGroupKostId,
          userId: currentUser.id,
        });
      } finally {
        if (active) setLoadingRoom(false);
      }
    }
    loadGroup();
    return () => {
      active = false;
    };
  }, [activeGroupKostId, currentUser.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [directMessages.length, groupDetail?.messages?.length]);

  // Polling fallback when Socket.IO is not connected
  useEffect(() => {
    if (socketConnected) return;
    if (!activeDirect && !activeGroupKostId) return;

    const timer = setInterval(async () => {
      if (activeDirect) {
        const params = new URLSearchParams({
          kostId: String(activeDirect.kostId),
          user1: String(currentUser.id),
          user2: String(activeDirect.peerId),
        });
        const res = await fetch(`/api/proxy/chats?${params.toString()}`).catch(
          () => null,
        );
        if (res?.ok) {
          const data = await res.json();
          setDirectMessages(Array.isArray(data) ? data : data?.data || []);
        }
      } else if (activeGroupKostId) {
        const res = await fetch(
          `/api/proxy/chats/groups/${activeGroupKostId}`,
        ).catch(() => null);
        if (res?.ok) {
          const data: KostGroupDetail = await res.json();
          setGroupDetail(data);
        }
      }
    }, 6000);

    return () => clearInterval(timer);
  }, [socketConnected, activeDirect, activeGroupKostId, currentUser.id]);

  async function handleSend(textToSend?: string) {
    const content = (textToSend ?? input).trim();
    if (!content) return;
    setSending(true);
    try {
      if (activeDirect) {
        const res = await fetch("/api/proxy/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kostId: activeDirect.kostId,
            senderId: currentUser.id,
            receiverId: activeDirect.peerId,
            message: content,
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          setDirectMessages((prev) =>
            prev.some((m) => m.id === data.id) ? prev : [...prev, data],
          );
          setConversations((prev) =>
            prev.map((c) => {
              const peerId =
                c.senderId === currentUser.id ? c.receiverId : c.senderId;
              return c.kostId === activeDirect.kostId &&
                peerId === activeDirect.peerId
                ? { ...c, message: content, createdAt: data.createdAt }
                : c;
            }),
          );
          if (!textToSend) setInput("");
        }
      } else if (activeGroupKostId) {
        const res = await fetch(
          `/api/proxy/chats/groups/${activeGroupKostId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: content }),
          },
        );
        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          setGroupDetail((prev) =>
            prev
              ? {
                  ...prev,
                  messages: prev.messages.some((m) => m.id === data.id)
                    ? prev.messages
                    : [...prev.messages, data],
                }
              : prev,
          );
          setGroups((prev) =>
            prev.map((g) =>
              g.kostId === activeGroupKostId
                ? { ...g, lastMessage: content, lastMessageAt: data.createdAt }
                : g,
            ),
          );
          if (!textToSend) setInput("");
        }
      }
    } finally {
      setSending(false);
    }
  }

  async function handleAddPeerToGroup() {
    if (!activeDirect) return;
    const res = await fetch(
      `/api/proxy/chats/groups/${activeDirect.kostId}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: activeDirect.peerId }),
      },
    );
    if (res.ok) {
      alert("Pengguna berhasil ditambahkan ke Grup Penghuni Kost!");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data?.message || "Gagal menambahkan ke grup.");
    }
  }

  async function handleKickMember(userId: number) {
    if (!activeGroupKostId) return;
    if (!window.confirm("Keluarkan anggota ini dari grup?")) return;
    const res = await fetch(
      `/api/proxy/chats/groups/${activeGroupKostId}/kick`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      },
    );
    if (res.ok) {
      setGroupDetail((prev) =>
        prev
          ? { ...prev, members: prev.members.filter((m) => m.userId !== userId) }
          : prev,
      );
    }
  }

  async function handleSearchCandidates(query: string) {
    if (!activeGroupKostId) return;
    setCandidateQuery(query);
    setSearchingCandidates(true);
    try {
      const params = new URLSearchParams({ adminId: String(currentUser.id) });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(
        `/api/proxy/chats/groups/${activeGroupKostId}/candidates?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        setCandidates(Array.isArray(data) ? data : data?.data || []);
      }
    } finally {
      setSearchingCandidates(false);
    }
  }

  async function handleAddMemberToGroup(userId: number) {
    if (!activeGroupKostId) return;
    const res = await fetch(
      `/api/proxy/chats/groups/${activeGroupKostId}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      },
    );
    if (res.ok) {
      const detailRes = await fetch(
        `/api/proxy/chats/groups/${activeGroupKostId}`,
      );
      if (detailRes.ok) {
        setGroupDetail(await detailRes.json());
      }
      setCandidates((prev) => prev.filter((c) => c.id !== userId));
    }
  }

  function handleToggleAdminOnly() {
    if (!activeGroupKostId || !groupDetail) return;
    const nextAdminOnly = !groupDetail.settings?.adminOnly;
    socketRef.current?.emit("updateGroupSettings", {
      kostId: activeGroupKostId,
      userId: currentUser.id,
      adminOnly: nextAdminOnly,
    });
    setGroupDetail((prev) =>
      prev
        ? {
            ...prev,
            settings: { ...prev.settings, adminOnly: nextAdminOnly },
          }
        : prev,
    );
  }

  const isGroupOwner =
    groupDetail &&
    (groupDetail.ownerId === currentUser.id ||
      currentUser.role === "ADMINISTRATOR");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid h-[calc(100vh-9.5rem)] min-h-[540px] grid-cols-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm md:grid-cols-3">
        {/* Left Sidebar: Inbox */}
        <aside className="flex flex-col border-r border-gray-200 bg-gray-50/50 overflow-y-auto">
          <div className="border-b border-gray-200 bg-white p-4">
            <h1 className="text-lg font-extrabold text-gray-900">Kotak Pesan</h1>
            <p className="text-xs text-gray-500">Chat Pribadi & Grup Penghuni</p>
          </div>

          <div className="p-3 space-y-4">
            {/* Group Rooms */}
            <div>
              <p className="px-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                Grup Penghuni Kost ({groups.length})
              </p>
              <div className="mt-1.5 space-y-1">
                {groups.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-gray-400">
                    Belum tergabung di grup kost.
                  </p>
                ) : (
                  groups.map((g) => (
                    <button
                      key={`grp-${g.kostId}`}
                      type="button"
                      onClick={() => {
                        setActiveDirect(null);
                        setActiveGroupKostId(g.kostId);
                        setGroups((prev) =>
                          prev.map((item) =>
                            item.kostId === g.kostId
                              ? { ...item, unreadCount: 0 }
                              : item,
                          ),
                        );
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition ${
                        activeGroupKostId === g.kostId
                          ? "bg-emerald-50 border border-emerald-200"
                          : "hover:bg-white"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {g.kostName}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {g.lastMessage || "Buka obrolan grup"}
                        </p>
                      </div>
                      {(g.unreadCount ?? 0) > 0 && (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                          {g.unreadCount}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 1-on-1 Conversations */}
            <div>
              <p className="px-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                Chat Pribadi ({conversations.length})
              </p>
              <div className="mt-1.5 space-y-1">
                {conversations.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-gray-400">
                    Belum ada percakapan pribadi.
                  </p>
                ) : (
                  conversations.map((c) => {
                    const peerId =
                      c.senderId === currentUser.id ? c.receiverId : c.senderId;
                    const peerName =
                      c.peerUser?.name ||
                      (c.senderId === currentUser.id
                        ? `Pengguna #${c.receiverId}`
                        : c.senderName);
                    const isSelected =
                      activeDirect?.kostId === c.kostId &&
                      activeDirect?.peerId === peerId;

                    return (
                      <button
                        key={`conv-${c.kostId}-${peerId}`}
                        type="button"
                        onClick={() => {
                          setActiveGroupKostId(null);
                          setActiveDirect({
                            kostId: c.kostId,
                            peerId,
                            title: `${peerName} • ${c.kost?.name || `Properti #${c.kostId}`}`,
                          });
                          setConversations((prev) =>
                            prev.map((item) => {
                              const itemPeerId =
                                item.senderId === currentUser.id
                                  ? item.receiverId
                                  : item.senderId;
                              return item.kostId === c.kostId &&
                                itemPeerId === peerId
                                ? { ...item, unreadCount: 0 }
                                : item;
                            }),
                          );
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition ${
                          isSelected
                            ? "bg-emerald-50 border border-emerald-200"
                            : "hover:bg-white"
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                          {c.peerUser?.avatarUrl || c.senderAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveImageUrl(c.peerUser?.avatarUrl || c.senderAvatar)}
                              alt={peerName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            peerName.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-sm font-bold text-gray-900">
                              {peerName}
                            </p>
                            {(c.unreadCount ?? 0) > 0 && (
                              <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {c.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-gray-500">{c.message}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Right: Active Chat Room */}
        <section className="flex flex-col md:col-span-2 bg-white">
          {!activeDirect && !activeGroupKostId ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-400">
              <MessageCircle className="h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm font-bold text-gray-700">
                Pilih percakapan atau grup di sebelah kiri
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Anda juga bisa memulai chat langsung dari halaman detail properti.
              </p>
            </div>
          ) : (
            <>
              {/* Room Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900">
                    {activeDirect
                      ? activeDirect.title
                      : groupDetail?.kostName || `Grup Properti #${activeGroupKostId}`}
                  </h2>
                  {groupDetail?.settings?.pinnedAnnouncement && (
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                      Pengumuman: {groupDetail.settings.pinnedAnnouncement}
                    </p>
                  )}
                </div>

                {activeDirect &&
                  (currentUser.role === "PEMILIK_KOST" ||
                    currentUser.role === "ADMINISTRATOR") && (
                    <button
                      type="button"
                      onClick={handleAddPeerToGroup}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Masukkan ke Grup
                    </button>
                  )}

                {activeGroupKostId && groupDetail && (
                  <button
                    type="button"
                    onClick={() => setShowMembers((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Anggota ({groupDetail.members?.length || 0})
                  </button>
                )}
              </div>

              {/* Group Members Drawer */}
              {showMembers && groupDetail && (
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-3 max-h-64 overflow-y-auto space-y-2.5">
                  {isGroupOwner && (
                    <div className="space-y-2 border-b border-gray-200 pb-2.5">
                      <label className="flex items-center justify-between text-xs font-bold text-gray-800 cursor-pointer">
                        <span>Mode Hanya Admin (kunci chat anggota)</span>
                        <input
                          type="checkbox"
                          checked={Boolean(groupDetail.settings?.adminOnly)}
                          onChange={handleToggleAdminOnly}
                          className="h-4 w-4 rounded text-emerald-600"
                        />
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={candidateQuery}
                          onChange={(e) => setCandidateQuery(e.target.value)}
                          placeholder="Cari nama/email untuk tambah anggota..."
                          className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleSearchCandidates(candidateQuery)}
                          disabled={searchingCandidates}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {searchingCandidates ? "..." : "Cari"}
                        </button>
                      </div>
                      {candidates.length > 0 && (
                        <div className="space-y-1 rounded-lg border border-emerald-200 bg-white p-2">
                          {candidates.map((cand) => (
                            <div
                              key={cand.id}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="truncate font-semibold text-gray-800">
                                {cand.name}{" "}
                                {cand.email ? `(${cand.email})` : ""}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddMemberToGroup(cand.id)}
                                className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 hover:bg-emerald-100"
                              >
                                <UserPlus className="h-3 w-3" />
                                Tambah
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {groupDetail.members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-gray-800">
                        {m.name} {m.isAdmin ? "(Admin)" : ""}
                      </span>
                      {isGroupOwner && m.userId !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() => handleKickMember(m.userId)}
                          className="inline-flex items-center gap-1 text-red-600 font-bold hover:underline"
                        >
                          <UserX className="h-3 w-3" />
                          Keluarkan
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/40">
                {loadingRoom ? (
                  <p className="text-center text-xs text-gray-400 py-8">
                    Memuat pesan...
                  </p>
                ) : activeDirect ? (
                  directMessages.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-8">
                      Belum ada pesan. Mulai obrolan sekarang!
                    </p>
                  ) : (
                    directMessages.map((m) => {
                      const isMe = m.senderId === currentUser.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-2xs ${
                              isMe
                                ? "bg-emerald-600 text-white"
                                : "bg-white border border-gray-200 text-gray-800"
                            }`}
                          >
                            <p className="whitespace-pre-line">{m.message}</p>
                            <p
                              className={`mt-1 text-[10px] ${
                                isMe ? "text-emerald-100" : "text-gray-400"
                              }`}
                            >
                              {new Date(m.createdAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  (groupDetail?.messages || []).map((m) => {
                    const isMe = m.senderId === currentUser.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-2xs ${
                            isMe
                              ? "bg-emerald-600 text-white"
                              : "bg-white border border-gray-200 text-gray-800"
                          }`}
                        >
                          {!isMe && (
                            <p className="text-[11px] font-bold text-emerald-700 mb-0.5">
                              {m.senderName}
                            </p>
                          )}
                          <p className="whitespace-pre-line">{m.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick Replies (for 1-on-1) */}
              {activeDirect && (
                <div className="flex gap-1.5 overflow-x-auto border-t border-gray-100 px-4 py-2 bg-white">
                  {QUICK_REPLIES.map((qr) => (
                    <button
                      key={qr}
                      type="button"
                      onClick={() => handleSend(qr)}
                      className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              {activeGroupKostId &&
              groupDetail?.settings?.adminOnly &&
              !isGroupOwner ? (
                <div className="flex items-center justify-center gap-2 border-t border-gray-200 bg-gray-50 p-3.5 text-xs font-semibold text-gray-500">
                  <Lock className="h-3.5 w-3.5" />
                  Hanya admin grup yang dapat mengirim pesan.
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2 border-t border-gray-200 bg-white p-3.5"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tulis pesan..."
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Kirim
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
