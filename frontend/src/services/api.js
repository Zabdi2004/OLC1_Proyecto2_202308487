const API_BASE_URL = 'http://localhost:8080/api';

export const apiService = {
    async checkHealth() {
        try {
            const res = await fetch(`${API_BASE_URL}/health`);
            return await res.json();
        } catch (error) {
            console.error('Error al conectar con backend:', error);
            return { status: 'error', message: 'Backend no disponible' };
        }
    },

    async executeCode(source) {
        const res = await fetch(`${API_BASE_URL}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Error del servidor' }));
            throw new Error(err.error || `HTTP error ${res.status}`);
        }
        return await res.json();
    },

    async analyzeCode(source) {
        const res = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source })
        });
        return await res.json();
    }
};
