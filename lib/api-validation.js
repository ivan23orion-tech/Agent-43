export const MAX_TASK_TITLE_LENGTH = 140;
export const MAX_TASK_DESCRIPTION_LENGTH = 2000;
export const MAX_SUBMISSION_CONTENT_LENGTH = 4000;

export function parsePositiveIntId(value) {
  if (Array.isArray(value)) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

export function validateRequiredText(value, fieldName, maxLength) {
  if (typeof value !== 'string') {
    return { error: `${fieldName} e obrigatorio` };
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { error: `${fieldName} e obrigatorio` };
  }

  if (trimmedValue.length > maxLength) {
    return { error: `${fieldName} deve ter no maximo ${maxLength} caracteres` };
  }

  return { value: trimmedValue };
}
