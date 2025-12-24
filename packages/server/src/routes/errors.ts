import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

interface ErrorReport {
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, any>;
  userAgent: string;
  version?: string;
}

/**
 * POST /api/errors
 * Collect errors from extension
 * 
 * This endpoint receives error reports from the Chrome extension
 * and logs them to Vercel logs (free, searchable, 90-day retention)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const report: ErrorReport = req.body;

    // Validate payload
    if (!report.message || !report.timestamp) {
      return res.status(400).json({ error: 'Invalid error report' });
    }

    // Log to Vercel (free, searchable)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 [EXTENSION ERROR]');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Message:', report.message);
    console.error('Time:', report.timestamp);
    console.error('Version:', report.version || 'unknown');
    console.error('User Agent:', report.userAgent);

    if (report.context) {
      console.error('Context:', JSON.stringify(report.context, null, 2));
    }

    if (report.stack) {
      console.error('Stack Trace:');
      console.error(report.stack);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to process error report:', error);
    res.status(500).json({ error: 'Failed to process error report' });
  }
});

export default router;

