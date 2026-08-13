import type {
  RequestHandler,
} from "express";

import {
  createRequestId,
  REQUEST_ID_HEADER,
} from "../utils/request-id.js";

export const requestIdMiddleware: RequestHandler = (
  req,
  res,
  next,
) => {
  const incomingRequestId =
    req.get(REQUEST_ID_HEADER);

  const requestId =
    incomingRequestId?.trim() ||
    createRequestId();

  res.setHeader(
    REQUEST_ID_HEADER,
    requestId,
  );

  res.locals.requestId = requestId;

  next();
};