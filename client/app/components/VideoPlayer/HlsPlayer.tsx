import Hls from "hls.js";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

type HlsPlayerProps = {
    src: string;
    poster?: string;
    className?: string;
    autoPlay?: boolean;
    onTimeUpdate?: (seconds: number) => void;
};

export const HlsPlayer = forwardRef<HTMLVideoElement, HlsPlayerProps>(function HlsPlayer(
    { src, poster, className, autoPlay, onTimeUpdate },
    forwardedRef
) {
    const localRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(forwardedRef, () => localRef.current as HTMLVideoElement, []);

    useEffect(() => {
        const video = localRef.current;
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
            ref={localRef}
            poster={poster}
            controls
            playsInline
            autoPlay={autoPlay}
            onTimeUpdate={event => onTimeUpdate?.(event.currentTarget.currentTime)}
            className={className}
        />
    );
});
