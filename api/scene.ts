import { onRequestGet } from '../cloud-functions/scene/index';
import { createVercelContext, methodNotAllowed, sendResponse } from './_adapter';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, 'GET');
    return;
  }

  const response = await onRequestGet(createVercelContext(req));
  await sendResponse(res, response);
}
