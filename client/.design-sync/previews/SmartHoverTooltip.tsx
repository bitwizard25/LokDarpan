import { SmartHoverTooltip } from 'lokdarpan-ui';
const Stage = ({ children, style }: any) => <div style={{ background: '#09090B', color: '#F4F4F5', padding: 24, ...style }}>{children}</div>;
const bullets = ['Parliament passed three bills in a single day', 'Opposition walkout over the agriculture bill', 'Speaker announced a committee review'];
export const Visible = () => (<Stage style={{ height: 280, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}><div style={{ position: 'relative', width: 120, height: 36, borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}><SmartHoverTooltip title="Monsoon Session recap" summaryBullets={bullets} isVisible /></div></Stage>);
