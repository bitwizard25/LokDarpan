import { VideoCard } from 'lokdarpan-ui';
const Stage = ({ children, style }: any) => <div style={{ background: '#09090B', color: '#F4F4F5', padding: 24, ...style }}>{children}</div>;
const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
export const Default = () => (<Stage style={{ maxWidth: 380 }}><VideoCard id="1" title="Inside the Monsoon Session: what changed in Parliament" channelName="Lok Report" views={128400} createdAt={ago(3)} duration={754} /></Stage>);
export const Live = () => (<Stage style={{ maxWidth: 380 }}><VideoCard id="2" title="Live: Budget analysis with the panel" channelName="Lok Report" views={9800} createdAt={ago(0)} isLive /></Stage>);
export const InProgress = () => (<Stage style={{ maxWidth: 380 }}><VideoCard id="3" title="Understanding GST in 10 minutes" channelName="Explain India" views={2100000} createdAt={ago(40)} duration={603} progress={55} /></Stage>);
