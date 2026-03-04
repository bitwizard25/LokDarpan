export type User = {
    id: string;
    name: string;
    avatar: string;
    color: string;
    isSpeaking?: boolean;
    isTyping?: boolean;
    isMuted?: boolean;
};

export const mockUsers: User[] = [
    { id: "1", name: "You", avatar: "A", color: "rgba(59, 130, 246, 1)", isMuted: true },
    { id: "2", name: "Sarah", avatar: "S", color: "rgba(236, 72, 153, 1)", isSpeaking: true },
    { id: "3", name: "Mike", avatar: "M", color: "rgba(16, 185, 129, 1)" },
    { id: "4", name: "Emma", avatar: "E", color: "rgba(245, 158, 11, 1)" },
    { id: "5", name: "John", avatar: "J", color: "rgba(168, 85, 247, 1)" },
];
