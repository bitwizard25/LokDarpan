import { KineticButton } from 'lokdarpan-ui';
const Stage = ({ children, style }: any) => <div style={{ background: '#09090B', color: '#F4F4F5', padding: 24, ...style }}>{children}</div>;
const row = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const };
export const Variants = () => (<Stage><div style={row}><KineticButton variant="primary">Watch now</KineticButton><KineticButton variant="secondary">Add to list</KineticButton><KineticButton variant="ghost">Share</KineticButton><KineticButton variant="glass">Start party</KineticButton></div></Stage>);
export const Sizes = () => (<Stage><div style={row}><KineticButton size="sm">Subscribe</KineticButton><KineticButton size="md">Subscribe</KineticButton><KineticButton size="lg">Subscribe</KineticButton></div></Stage>);
export const Disabled = () => (<Stage><div style={row}><KineticButton disabled style={{ opacity: 0.5 }}>Unavailable</KineticButton></div></Stage>);
