import { AvatarStack, useAppStore } from 'lokdarpan-ui';
const Stage = ({ children, style }: any) => <div style={{ background: '#09090B', color: '#F4F4F5', padding: 24, ...style }}>{children}</div>;
export const TheaterMode = () => { useAppStore.setState({ isTheaterMode: true }); return (<Stage style={{ height: 160, position: 'relative' }}><AvatarStack /></Stage>); };
