import { ApiError } from "../api/client";

interface ErrorMessageProps {
  error: unknown;
  // Field errors already shown next to their inputs, so they aren't repeated here.
  shownFields?: string[];
}

export function ErrorMessage({ error, shownFields = [] }: ErrorMessageProps) {
  if (!error) {
    return null;
  }
  const apiError = error instanceof ApiError ? error : null;
  const otherFields = apiError
    ? Object.entries(apiError.fieldErrors).filter(([field]) => !shownFields.includes(field))
    : [];
  return (
    <div className="message error" role="alert">
      <span className="icon" aria-hidden="true">!</span>
      <div>
        <div>{apiError ? apiError.message : "Something went wrong."}</div>
        {otherFields.map(([field, message]) => (
          <div key={field}>
            <code>{field}</code>: {message}
          </div>
        ))}
      </div>
    </div>
  );
}
