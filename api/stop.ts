import { onRequest } from '../agents/stop/index';
import { createVercelContext, methodNotAllowed, sendResponse } from './_adapter';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, 'POST');
    return;
  }

  const response = await onRequest(createVercelContext(req));
  await sendResponse(res, response);
}
