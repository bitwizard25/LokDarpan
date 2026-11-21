import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

interface VideoSkeletonProps {
    count?: number;
}

/** Placeholder matching the VideoCard layout (thumbnail + title + channel line). */
export function VideoSkeleton({ count = 1 }: VideoSkeletonProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <Card
                    key={index}
                    aria-hidden="true"
                    className="flex flex-col gap-2 h-full p-2 rounded-2xl bg-dark-900 border-white/5 shadow-none"
                >
                    <Skeleton className="aspect-video w-full rounded-[10px] bg-white/10" />
                    <div className="flex flex-col gap-2 px-1 pb-1">
                        <Skeleton className="h-4 w-full bg-white/10" />
                        <Skeleton className="h-4 w-3/4 bg-white/10" />
                        <div className="flex items-center gap-2 pt-1">
                            <Skeleton className="h-3 w-1/2 bg-white/10" />
                            <Skeleton className="ml-auto size-8 rounded-full bg-white/10" />
                        </div>
                    </div>
                </Card>
            ))}
        </>
    );
}

export function ShortsSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="flex gap-4 overflow-hidden" aria-hidden="true">
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="flex-none w-[clamp(140px,16vw,200px)] flex flex-col gap-2">
                    <Skeleton className="aspect-[9/16] w-full rounded-2xl bg-white/10" />
                    <Skeleton className="h-4 w-4/5 bg-white/10" />
                    <Skeleton className="h-3 w-1/3 bg-white/10" />
                </div>
            ))}
        </div>
    );
}

// Fixed widths (not Math.random) so server and client render the same markup.
const CHIP_WIDTHS = [72, 96, 84, 104, 78, 90, 100, 68];

export function CategoryChipsSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="flex gap-3 overflow-hidden" aria-hidden="true">
            {Array.from({ length: count }).map((_, index) => (
                <Skeleton
                    key={index}
                    className="h-10 rounded-full flex-shrink-0 bg-white/10"
                    style={{ width: `${CHIP_WIDTHS[index % CHIP_WIDTHS.length]}px` }}
                />
            ))}
        </div>
    );
}
