'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFinb } from '@/lib/appCtx';
import { GAMES } from '@/lib/catalog';
import { formatCompact, formatCredits, timeAgo } from '@/lib/economy';
import { Badge, EmptyState, Icon, Panel, ScreenHeader, SectionTitle } from '../ui';
import { emotePalette } from '@/lib/net';

export function FriendsScreen() {
  const api = useFinb();
  const { user } = api;
  const [handle, setHandle] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [recipient, setRecipient] = useState(user.friends[0]?.username ?? '');
  const [roomName, setRoomName] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const friends = user.friends;
  const openChallenges = user.challenges.filter(challenge => challenge.state === 'open');

  const suggestions = api.standings.filter(row => !row.isYou && !row.isFriend).slice(0, 6);

  const add = async () => {
    await api.addFriend(handle);
    setHandle('');
  };

  const transfer = () => {
    api.transfer(recipient, Number(amount), note);
    setAmount('');
    setNote('');
  };

  const room = user.rooms[0];

  return (
    <div className="space-y-5">
      <ScreenHeader
        eyebrow="FRIENDS ZONE · USERNAME ONLY"
        title={<>Your <span className="aberrate">circle</span></>}
        sub="Add anyone by username. Transfers never need a card number, and every social action earns Liberals."
        right={
          <div className="flex flex-wrap gap-2">
            <Badge tone="flame">{friends.length} FRIENDS</Badge>
            <Badge tone="lime">{user.stats.tipsReceived} CR TIPS RECEIVED</Badge>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel className="p-4">
          <SectionTitle kicker="FIND A MEMBER" title="Add by username" />
          <div className="flex flex-wrap gap-2">
            <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-2xl border border-white/12 bg-navy-900/60 px-3">
              <span className="font-mono text-flame-400">@</span>
              <input
                value={handle}
                onChange={event => setHandle(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && add()}
                placeholder="Type a username — e.g. LedgerFox"
                className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-white/30"
              />
            </div>
            <button className="btn btn-flame" onClick={add}>
              Add friend
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="label mr-1 self-center">FLOOR SUGGESTIONS</span>
            {suggestions.map(row => (
              <button key={row.id} className="chip hover:border-lime-500/60" onClick={() => setHandle(row.username)}>
                {row.online ? '● ' : '○ '}
                {row.username}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {friends.length === 0 ? (
              <EmptyState glyph="🤝" title="Your circle is empty" hint="Add a floor member above — they instantly appear in transfers, challenges and spectating." />
            ) : (
              friends.map(friend => {
                const row = api.standings.find(item => item.username.toLowerCase() === friend.username.toLowerCase());
                const online = row?.online ?? false;
                return (
                  <motion.div key={friend.id} layout className="jelly-flat flex flex-wrap items-center gap-3 p-3">
                    <span className="relative grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(140deg,#ff6b00,#00c853)] font-mono text-[11px] font-bold text-navy-900">
                      {friend.username.slice(0, 2).toUpperCase()}
                      <i className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-navy-900 ${online ? 'bg-lime-400' : 'bg-white/30'}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="flex items-center gap-1.5 truncate text-xs text-cream-100">
                        {friend.username}
                        {friend.favourite && <span className="text-flame-400">★</span>}
                        {friend.emote && <span>{friend.emote}</span>}
                      </b>
                      <span className="text-[11px] text-white/50">
                        {row ? `${row.status} · ${formatCompact(row.credits)} cr · ${row.liberals} LP` : 'floor member'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <button className="rounded-full border border-white/15 px-2 py-1 font-mono text-[10px] text-white/60 hover:border-flame-500/60" onClick={() => api.toggleFavourite(friend.id)}>
                        ★
                      </button>
                      {emotePalette().slice(0, 4).map(symbol => (
                        <button key={symbol} className="rounded-full border border-white/10 px-1.5 py-1 text-xs hover:border-lime-500/60" onClick={() => api.setEmote(friend.id, symbol)}>
                          {symbol}
                        </button>
                      ))}
                      <button className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-lime-300 hover:border-lime-500/60" onClick={() => setRecipient(friend.username)}>
                        SEND
                      </button>
                      <button className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-flame-300 hover:border-flame-500/60" onClick={() => api.challenge(friend.username, 'vault-rush', 40 + Math.round(Math.random() * 160))}>
                        CHALLENGE
                      </button>
                      <button className="rounded-full border border-white/10 px-2 py-1 font-mono text-[10px] text-white/40 hover:text-flame-300" onClick={() => api.removeFriend(friend.id)}>
                        ×
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel glow="lime" className="p-4">
            <SectionTitle kicker="INSTANT TRANSFER" title="Send a little something" sub="Username routing only. No card numbers, ever." />
            <div className="space-y-2">
              <select className="field" value={recipient} onChange={event => setRecipient(event.target.value)}>
                <option value="">Choose a friend</option>
                {friends.map(friend => (
                  <option key={friend.id} value={friend.username}>
                    {friend.username}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-navy-900/60 px-3">
                <input
                  value={amount}
                  onChange={event => setAmount(event.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  inputMode="numeric"
                  className="w-full bg-transparent py-2.5 font-mono text-lg outline-none placeholder:text-white/25"
                />
                <span className="font-mono text-xs text-flame-400">cr</span>
              </div>
              <input className="field" value={note} onChange={event => setNote(event.target.value)} placeholder="Add a note (optional)" maxLength={48} />
              <div className="flex items-center justify-between text-[11px] text-white/50">
                <span>AVAILABLE</span>
                <b className="font-mono text-lime-300">{formatCredits(user.credits)} cr</b>
              </div>
              <button className="btn btn-lime w-full" disabled={!friends.length || !recipient} onClick={transfer}>
                Send Credits
              </button>
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionTitle kicker="PRIVATE ROOMS" title="Invite-code lobbies" sub="Up to 13 seats, own chat, any mode." />
            <div className="flex gap-2">
              <input className="field" value={roomName} onChange={event => setRoomName(event.target.value)} placeholder="Room name" />
              <button className="btn btn-flame" onClick={() => { api.createRoom(roomName, 'heist-party'); setRoomName(''); }}>
                Create
              </button>
            </div>
            {room ? (
              <div className="mt-3 jelly-flat p-3">
                <div className="flex items-center justify-between">
                  <b className="text-xs text-cream-100">
                    {room.name} <span className="font-mono text-flame-300">#{room.code}</span>
                  </b>
                  <Badge tone="lime">{room.members.length} SEATS</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {room.members.map(member => (
                    <span key={member} className="chip">
                      {member}
                    </span>
                  ))}
                </div>
                <div className="mt-2 max-h-32 space-y-1 overflow-y-auto scrollbar-none">
                  {room.chat.map(message => (
                    <div key={message.id} className="text-[11px]">
                      <b className="text-lime-300">{message.from}:</b> <span className="text-white/70">{message.text}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="field"
                    value={chatDraft}
                    onChange={event => setChatDraft(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && chatDraft.trim()) {
                        api.chatRoom(room.code, chatDraft.trim());
                        setChatDraft('');
                      }
                    }}
                    placeholder="Say something to the room"
                  />
                  <button
                    className="btn btn-ghost-lime"
                    onClick={() => {
                      if (!chatDraft.trim()) return;
                      api.chatRoom(room.code, chatDraft.trim());
                      setChatDraft('');
                    }}
                  >
                    Send
                  </button>
                </div>
                <button className="btn btn-duo mt-2 w-full" onClick={() => api.openRoom(room.mode, Math.min(13, room.members.length))}>
                  Launch {room.mode.replace('-', ' ')}
                </button>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-white/45">No rooms yet. Create one and your first four friends are auto-invited.</p>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionTitle kicker="FRIEND CHALLENGES" title="Head-to-head dares" sub="Beat the target inside the game to take the purse." />
          {openChallenges.length === 0 ? (
            <EmptyState glyph="⚔️" title="No open dares" hint="Hit CHALLENGE next to a friend to set a target score." />
          ) : (
            <div className="space-y-2">
              {openChallenges.map(challenge => (
                <div key={challenge.id} className="jelly-flat flex items-center gap-3 p-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-flame-500/15 text-lg">⚔️</span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-xs text-cream-100">
                      {challenge.fromUsername} → beat {formatCompact(challenge.target)}
                    </b>
                    <span className="text-[11px] text-white/50">
                      {GAMES.find(game => game.id === challenge.gameId)?.title ?? challenge.gameId} · purse {challenge.reward} cr · {timeAgo(challenge.createdAt)}
                    </span>
                  </div>
                  <button className="btn btn-ghost-lime !px-3 !py-1.5 text-[11px]" onClick={() => api.openGame(challenge.gameId)}>
                    Accept ▶
                  </button>
                  <button className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-white/60" onClick={() => api.resolveChallenge(challenge.id, challenge.target)}>
                    SUBMIT {formatCompact(challenge.target)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="p-4">
          <SectionTitle kicker="SHARED FEED" title="What the floor is doing" sub="Live activity from your circle and the wider floor." />
          <div className="space-y-1.5">
            {(user.friends.length ? api.standings.filter(row => row.isFriend).slice(0, 8) : api.standings.slice(0, 8)).map(row => (
              <div key={`${row.id}-feed`} className="flex items-center gap-3 border-b border-white/6 pb-1.5 last:border-0">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/6 font-mono text-[10px]">{row.username.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-xs text-cream-100">{row.username}</b>
                  <span className="text-[11px] text-white/50">{row.status}</span>
                </div>
                <span className="font-mono text-[10px] text-white/40">{formatCompact(row.credits)} cr</span>
                <button className="rounded-full border border-lime-500/40 px-2 py-1 font-mono text-[10px] text-lime-300" onClick={() => api.tip(row.username, 15)}>
                  TIP 15
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-white/45">
            <Icon name="eye" className="h-3.5 w-3.5 text-lime-300" />
            Spectator lounge: watch any mode and tip the plays you like. You have tipped {user.stats.tipsGiven} times.
          </div>
        </Panel>
      </div>
    </div>
  );
}
