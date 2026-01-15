// services/geminiLive.ts

// Função vazia para enganar o App.tsx e não dar erro de importação
export const initializeAudioContext = () => {
    return null;
};

// Classe vazia para não quebrar o site
export class GeminiLiveService {
    onStatusChange: any = null;

    constructor() {}

    async connect(context: any) {
        console.log("Gemini desativado.");
        return;
    }

    disconnect() {}
}