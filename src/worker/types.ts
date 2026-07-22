export interface Env {
  MEDICATION_STATE: DurableObjectNamespace;
  ASSETS: Fetcher;
  ACCESS_TOKEN_HASH: string;
  ACCESS_TOKEN_LENGTH: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  TIME_ZONE: string;
}
