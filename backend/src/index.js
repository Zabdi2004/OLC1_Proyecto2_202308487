import app from './app.js';

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 AutoInfra Backend corriendo en http://localhost:${PORT}`);
    console.log(`📡 Endpoints disponibles en /api (execute, analyze, health, etc.)`);
    console.log(`====================================================`);
});
