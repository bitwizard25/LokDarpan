import { useEffect, useRef, useState } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

type LazyImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
    /** Classes for the wrapper (size/aspect/rounding). The image fills it. */
    wrapperClassName?: string;
};

/** Native lazy-loaded image that shows a shadcn Skeleton until it has loaded. */
export function LazyImage({ className, wrapperClassName, alt = "", onLoad, onError, ...props }: LazyImageProps) {
    const ref = useRef<HTMLImageElement>(null);
    const [loaded, setLoaded] = useState(false);

    // Image may already be complete before hydration attaches onLoad.
    useEffect(() => {
        if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
    }, []);

    return (
        <div className={cn("relative overflow-hidden", wrapperClassName)}>
            {!loaded && <Skeleton className="absolute inset-0 rounded-none bg-white/10" />}
            <img
                ref={ref}
                alt={alt}
                loading="lazy"
                decoding="async"
                onLoad={(e) => {
                    setLoaded(true);
                    onLoad?.(e);
                }}
                onError={(e) => {
                    setLoaded(true);
                    onError?.(e);
                }}
                className={cn("w-full h-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0", className)}
                {...props}
            />
        </div>
    );
}
