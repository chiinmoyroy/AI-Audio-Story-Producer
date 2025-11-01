export const AVAILABLE_VOICES: string[] = [
    'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
];

export const BACKGROUND_MUSIC_TRACKS: Record<string, { name: string, url: string }> = {
    'none': { name: 'None', url: '' },
    'cinematic': { name: 'Cinematic Suspense', url: 'https://cdn.pixabay.com/download/audio/2022/11/21/audio_a28b572342.mp3' },
    'mysterious': { name: 'Mysterious Ambient', url: 'https://cdn.pixabay.com/download/audio/2022/08/03/audio_eb7219f5d3.mp3' },
    'fantasy': { name: 'Fantasy Adventure', url: 'https://cdn.pixabay.com/download/audio/2024/05/10/audio_29759e51c3.mp3' },
    'lofi': { name: 'Lofi Relaxing', url: 'https://cdn.pixabay.com/download/audio/2024/02/20/audio_55a2977f6b.mp3' },
};
