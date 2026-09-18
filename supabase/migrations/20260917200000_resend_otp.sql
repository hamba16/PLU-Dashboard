alter table plu_private.sessions
  add column otp_hash text,
  add column otp_expires_at timestamptz;
