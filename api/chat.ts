import { onRequest } from '../agents/chat/index';
import { createVercelContext, methodNotAllowed, sendResponse } from './_adapter';

export const config = {
  maxDuration: 300,
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, 'POST');
    return;
  }

  const response = await onRequest(createVercelContext(req));
  await sendResponse(res, response);
}
