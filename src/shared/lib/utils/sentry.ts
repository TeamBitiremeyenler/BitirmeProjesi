import * as Sentry from "@sentry/react-native";

type Primitive = string | number | bigint | boolean | symbol | null | undefined;

type ExceptionParams = {
  title: string;
  error: unknown;
  tags?: Record<string, Primitive>;
};

export const MANUAL_ERROR_CAPTURE = ({ title, error, tags }: ExceptionParams) => {
  Sentry.captureException(
    {
      title: new Error(title),
      error,
    },
    {
      tags,
    }
  );
};
