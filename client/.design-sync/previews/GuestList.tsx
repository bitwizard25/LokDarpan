import { GuestList } from 'lokdarpan-ui';
const Stage = ({ children, style }: any) => <div style={{ background: '#09090B', color: '#F4F4F5', padding: 24, ...style }}>{children}</div>;
const users = [
  { id: '1', name: 'You', avatar: 'A', color: 'rgba(59, 130, 246, 1)', isMuted: true },
  { id: '2', name: 'Sarah', avatar: 'S', color: 'rgba(236, 72, 153, 1)', isSpeaking: true },
  { id: '3', name: 'Mike', avatar: 'M', color: 'rgba(16, 185, 129, 1)' },
  { id: '4', name: 'Emma', avatar: 'E', color: 'rgba(245, 158, 11, 1)', isTyping: true },
];
export const Open = () => (<Stage style={{ height: 760, position: 'relative' }}><GuestList isOpen onClose={() => {}} users={users} /></Stage>);
