import Hls from "hls.js";
import { useEffect, useRef } from "react";

type HlsPlayerProps = {
    src: string;
    poster?: string;
    className?: string;
    autoPlay?: boolean;
    onTimeUpdate?: (seconds: number) => void;
};

export function HlsPlayer({ src, poster, className, autoPlay, onTimeUpdate }: HlsPlayerProps) {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = ref.current;
        if (!video || !src) return;

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = src;
            return;
        }

        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
            });
            hls.loadSource(src);
            hls.attachMedia(video);
            return () => {
                hls.destroy();
            };
        }

        video.src = src;
    }, [src]);

    return (
        <video
            ref={ref}
            poster={poster}
            controls
            playsInline
            autoPlay={autoPlay}
            onTimeUpdate={event => onTimeUpdate?.(event.currentTarget.currentTime)}
            className={className}
        />
    );
}
