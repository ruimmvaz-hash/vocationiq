-- VocationIQ — contador server-side do limite de mensagens do chatbot
-- público (5 mensagens / 24h por uid anónimo gerado no browser). Sem isto
-- o limite seria só decorativo (bastaria limpar o localStorage sem sequer
-- recarregar a página).

CREATE TABLE IF NOT EXISTS public.viq_chat_sessions (
  uid text PRIMARY KEY,
  message_count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.viq_chat_sessions ENABLE ROW LEVEL SECURITY;
