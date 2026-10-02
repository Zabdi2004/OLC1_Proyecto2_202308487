import { Router } from 'express';
import {
    healthCheck,
    executeCode,
    analyzeCode,
    getTokens,
    getAst,
    getSymbols,
    getErrors
} from '../controllers/compiler.controller.js';

const router = Router();

router.get('/health', healthCheck);
router.post('/execute', executeCode);
router.post('/analyze', analyzeCode);
router.post('/tokens', getTokens);
router.post('/ast', getAst);
router.post('/symbols', getSymbols);
router.post('/errors', getErrors);

export default router;
