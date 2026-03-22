import crypto from 'crypto';

export const CREATOR_KEY_HEADER_NAMES = ['x-creator-key', 'creator-key'];
export const CREATOR_LABEL_HEADER_NAMES = ['x-creator-label', 'creator-label'];

function readHeaderValue(req, headerNames) {
  for (const headerName of headerNames) {
    const value = req.headers[headerName];

    if (Array.isArray(value)) {
      const firstNonEmptyValue = value.find((headerValue) => typeof headerValue === 'string' && headerValue.trim());
      if (firstNonEmptyValue) {
        return firstNonEmptyValue.trim();
      }
      continue;
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

export function getCreatorCredentials(req) {
  const creatorKey = normalizeOptionalString(req.body?.creatorKey)
    ?? readHeaderValue(req, CREATOR_KEY_HEADER_NAMES);
  const creatorLabel = normalizeOptionalString(req.body?.creatorLabel)
    ?? readHeaderValue(req, CREATOR_LABEL_HEADER_NAMES);

  return { creatorKey, creatorLabel };
}

export function hashCreatorKey(creatorKey) {
  return crypto.createHash('sha256').update(creatorKey).digest('hex');
}

export function isTaskCreator(task, creatorKey) {
  if (!task || task.isFree || !task.creatorKeyHash || !creatorKey) {
    return false;
  }

  return task.creatorKeyHash === hashCreatorKey(creatorKey);
}

export function serializeTask(task, { includeSubmissions = false } = {}) {
  if (!task) {
    return null;
  }

  const serializedTask = {
    id: task.id,
    title: task.title,
    description: task.description,
    rewardAmount: task.rewardAmount,
    rewardCurrency: task.rewardCurrency,
    isFree: task.isFree,
    creatorLabel: task.creatorLabel,
    expiresAt: task.expiresAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };

  if (includeSubmissions) {
    serializedTask.submissions = task.submissions ?? [];
  }

  return serializedTask;
}
