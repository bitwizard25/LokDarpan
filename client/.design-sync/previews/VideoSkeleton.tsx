import { VideoSkeleton, ShortsSkeleton, CategoryChipsSkeleton } from 'lokdarpan-ui';
const Stage = ({ children, style }: any) => <div style={{ background: '#09090B', color: '#F4F4F5', padding: 24, ...style }}>{children}</div>;
export const Video = () => (<Stage style={{ maxWidth: 380 }}><VideoSkeleton /></Stage>);
export const VideoGrid = () => (<Stage style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}><VideoSkeleton count={2} /></Stage>);
export const Shorts = () => (<Stage><ShortsSkeleton count={4} /></Stage>);
export const Chips = () => (<Stage><CategoryChipsSkeleton count={6} /></Stage>);
