import { GlassContainer } from 'lokdarpan-ui';
const Stage = ({ children, style }: any) => <div style={{ background: '#09090B', color: '#F4F4F5', padding: 24, ...style }}>{children}</div>;
const glow = { background: 'radial-gradient(circle at top, rgba(59,130,246,0.35), #09090B 70%)', padding: 32 };
export const Default = () => (<Stage style={glow}><GlassContainer><h3 style={{ fontSize: 18, fontWeight: 700 }}>Watch party tonight</h3><p className="text-dark-300 text-sm mt-2">Starts at 9:00 PM with 12 friends joining.</p></GlassContainer></Stage>);
export const NoPadding = () => (<Stage style={glow}><GlassContainer noPadding><div className="p-3 text-sm text-dark-200">Custom inner spacing</div></GlassContainer></Stage>);
