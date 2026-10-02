import express from 'express';
import cors from 'cors';
import compilerRoutes from './routes/compiler.routes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas de la API
app.use('/api', compilerRoutes);

// Ruta raíz de bienvenida
app.get('/', (req, res) => {
    res.json({
        name: 'AutoInfra Backend API',
        version: '1.0.0',
        description: 'Servidor del compilador/intérprete de AutoInfra para OLC1 Proyecto 2',
        endpoints: [
            'GET /api/health',
            'POST /api/execute',
            'POST /api/analyze',
            'POST /api/tokens',
            'POST /api/ast',
            'POST /api/symbols',
            'POST /api/errors'
        ]
    });
});

export default app;
