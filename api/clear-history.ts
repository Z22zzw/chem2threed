import { onRequestPost } from '../cloud-functions/clear-history/index';
import { createVercelContext, methodNotAllowed, sendResponse } from './_adapter';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, 'POST');
    return;
  }

  const response = await onRequestPost(createVercelContext(req));
  await sendResponse(res, response);
}
