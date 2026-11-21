import { Sidebar } from 'lokdarpan-ui';
const Stage = ({ children, style }: any) => <div style={{ background: '#09090B', color: '#F4F4F5', padding: 24, ...style }}>{children}</div>;
export const Default = () => (<Stage style={{ height: 420, width: 240 }}><Sidebar /></Stage>);
