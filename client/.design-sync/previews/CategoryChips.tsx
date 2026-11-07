import { CategoryChips } from 'lokdarpan-ui';
const Stage = ({ children, style }: any) => <div style={{ background: '#09090B', color: '#F4F4F5', padding: 24, ...style }}>{children}</div>;
const cats = ['All', 'Politics', 'Cricket', 'Technology', 'Music', 'News', 'Education'];
export const Default = () => (<Stage><CategoryChips categories={cats} /></Stage>);
export const ActiveCategory = () => (<Stage><CategoryChips categories={cats} activeCategory="Cricket" /></Stage>);
