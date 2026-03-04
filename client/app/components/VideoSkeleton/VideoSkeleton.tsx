interface VideoSkeletonProps {
    count?: number;
}

export function VideoSkeleton({ count = 1 }: VideoSkeletonProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <article key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                    {/* Thumbnail skeleton */}
                    <div className="skeleton aspect-video rounded-3xl mb-4 bg-gradient-to-br from-[#1A1A1D] to-[#2A2A2D] animate-pulse ring-1 ring-white/5 shadow-2xl" />

                    {/* Info skeleton */}
                    <div className="flex gap-4">
                        {/* Avatar skeleton */}
                        <div className="skeleton w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-[#1A1A1D] to-[#2A2A2D] animate-pulse ring-1 ring-white/5" />

                        {/* Text content skeleton */}
                        <div className="flex-1 space-y-3 py-1">
                            {/* Title skeleton - 2 lines */}
                            <div className="skeleton h-4 rounded w-full bg-gradient-to-r from-[#1A1A1D] to-[#2A2A2D] animate-pulse" />
                            <div className="skeleton h-4 rounded w-3/4 bg-gradient-to-r from-[#1A1A1D] to-[#2A2A2D] animate-pulse" />

                            {/* Channel name skeleton */}
                            <div className="skeleton h-3 rounded w-1/2 mt-3 bg-gradient-to-r from-[#1A1A1D] to-[#2A2A2D] animate-pulse" />

                            {/* Views skeleton */}
                            <div className="skeleton h-3 rounded w-1/3 bg-gradient-to-r from-[#1A1A1D] to-[#2A2A2D] animate-pulse" />
                        </div>
                    </div>
                </article>
            ))}
        </>
    );
}

export function ShortsSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="skeleton w-48 aspect-[9/16] rounded-2xl flex-shrink-0 bg-gradient-to-b from-[#1A1A1D] to-[#2A2A2D] animate-pulse ring-1 ring-white/5"
                    style={{ animationDelay: `${index * 50}ms` }}
                />
            ))}
        </div>
    );
}

export function CategoryChipsSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="skeleton h-10 rounded-full flex-shrink-0 bg-gradient-to-r from-[#1A1A1D] to-[#2A2A2D] animate-pulse border border-white/5"
                    style={{
                        width: `${60 + Math.random() * 40}px`,
                        animationDelay: `${index * 30}ms`
                    }}
                />
            ))}
        </div>
    );
}
